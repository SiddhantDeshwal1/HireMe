"""
HireMe FastAPI Backend
======================
High-performance REST API powered by SQLite database, in-memory query cache,
and periodic multi-site scraping worker.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from database import (
    init_db,
    get_job_by_id,
    search_jobs_from_db,
    report_job_dead_in_db,
    get_db_stats,
    get_available_companies,
    get_or_create_user_profile,
    update_user_profile,
    extract_skills_from_text,
)
from cache import cache
from resume_analyzer import analyze_resume_text, extract_text_from_pdf
from worker import periodic_worker, worker_telemetry, scrape_all_sites, add_career_link, read_links
from urllib.parse import urlparse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

MEDIA_DIR = Path(__file__).parent / "media" / "logos"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("HireMe backend initializing...")
    init_db()
    # Launch background worker
    worker_task = asyncio.create_task(periodic_worker())
    yield
    log.info("HireMe backend shutting down...")
    worker_task.cancel()


app = FastAPI(
    title="HireMe API",
    version="2.0.0",
    description="Multi-board job aggregator API with SQLite & 5-day TTL caching",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local company logo assets
app.mount("/logos", StaticFiles(directory=str(MEDIA_DIR)), name="logos")


# ── Schemas ───────────────────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    page: int
    limit: int
    totalMatching: int
    totalPages: int
    hasNextPage: bool
    hasPrevPage: bool
    nextCursor: str | None = None
    hasMore: bool = False
    duplicatesMergedCount: int = 0


class JobsResponse(BaseModel):
    data: list[dict[str, Any]]
    pagination: PaginationMeta
    fromCache: bool = False


class ReportDeadRequest(BaseModel):
    reason: str = "other"
    notes: str | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    """Health check, database metrics, and cache statistics."""
    db_stats = get_db_stats()
    cache_stats = cache.stats()
    return {
        "status": "healthy",
        "database": db_stats,
        "cache": cache_stats,
        "worker": {
            "lastSync": worker_telemetry.last_sync.isoformat() if worker_telemetry.last_sync else None,
            "scrapersActive": worker_telemetry.scrapers_active,
            "activeSitesCount": worker_telemetry.active_sites_count,
            "totalScrapedAllTime": worker_telemetry.total_scraped_all_time,
            "lastCycleDurationSecs": worker_telemetry.last_cycle_duration_secs,
        },
    }


@app.get("/api/v1/companies")
async def get_companies():
    """Return live list of tracked companies and active opening counts."""
    cache_key = "companies:list"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    companies = get_available_companies()
    cache.set(cache_key, companies, ttl=60)
    return companies


@app.get("/api/v1/jobs", response_model=JobsResponse)
async def get_jobs(
    q: str | None = Query(None, description="Full-text search keyword"),
    companies: str | None = Query(None, description="Comma-separated company names"),
    date_posted: str = Query("all", description="24h|7d|30d|all"),
    work_setup: str | None = Query(None, description="Comma-separated: remote,hybrid,on-site"),
    job_type: str | None = Query(None, description="Comma-separated: full-time,contract,internship"),
    experience_level: str | None = Query(None, description="Comma-separated: entry,mid,senior,lead,executive"),
    min_salary: int = Query(0, description="Minimum annual salary in USD"),
    sort_by: str = Query("relevant", description="relevant|newest|salary"),
    page: int = Query(1, ge=1, description="Page number, 1-indexed"),
    limit: int = Query(10, ge=1, le=50, description="Items per page"),
    match_resume: bool = Query(False, description="Filter/rank by resume skills"),
    resume_skills: str | None = Query(None, description="Comma-separated resume skills"),
):
    """
    Search jobs strictly from SQLite database with in-memory caching.
    Supports company multi-select and resume skill matching.
    """
    company_list = [c.strip() for c in companies.split(",") if c.strip()] if isinstance(companies, str) else []
    work_setups = [s.strip() for s in work_setup.split(",")] if isinstance(work_setup, str) else []
    job_types = [s.strip() for s in job_type.split(",")] if isinstance(job_type, str) else []
    experience_levels = [s.strip() for s in experience_level.split(",")] if isinstance(experience_level, str) else []
    parsed_resume_skills = [s.strip() for s in resume_skills.split(",") if s.strip()] if isinstance(resume_skills, str) else []

    safe_q = q if isinstance(q, str) else ""
    safe_date_posted = date_posted if isinstance(date_posted, str) else "all"
    safe_min_salary = min_salary if isinstance(min_salary, int) else 0
    safe_sort_by = sort_by if isinstance(sort_by, str) else "relevant"
    safe_page = page if isinstance(page, int) else 1
    safe_limit = limit if isinstance(limit, int) else 10
    safe_match_resume = bool(match_resume) if isinstance(match_resume, bool) else False

    cache_params = {
        "q": safe_q,
        "companies": sorted(company_list),
        "date_posted": safe_date_posted,
        "work_setup": sorted(work_setups),
        "job_type": sorted(job_types),
        "experience_level": sorted(experience_levels),
        "min_salary": safe_min_salary,
        "sort_by": safe_sort_by,
        "page": safe_page,
        "limit": safe_limit,
        "match_resume": safe_match_resume,
        "resume_skills": sorted(parsed_resume_skills),
    }
    cache_key = cache.make_key("jobs", cache_params)

    # Check query cache
    cached_val = cache.get(cache_key)
    if cached_val is not None:
        cached_val["fromCache"] = True
        return cached_val

    # Query SQLite database
    offset = (safe_page - 1) * safe_limit
    jobs, total_matching = search_jobs_from_db(
        q=safe_q,
        companies=company_list,
        work_setups=work_setups,
        job_types=job_types,
        experience_levels=experience_levels,
        min_salary=safe_min_salary,
        date_posted=safe_date_posted,
        sort_by=safe_sort_by,
        limit=safe_limit,
        offset=offset,
        resume_skills=parsed_resume_skills,
        match_resume=safe_match_resume,
    )

    total_pages = max(1, (total_matching + safe_limit - 1) // safe_limit)
    has_next = safe_page < total_pages
    has_prev = safe_page > 1

    response_data = {
        "data": jobs,
        "pagination": {
            "page": safe_page,
            "limit": safe_limit,
            "totalMatching": total_matching,
            "totalPages": total_pages,
            "hasNextPage": has_next,
            "hasPrevPage": has_prev,
            "nextCursor": jobs[-1]["id"] if jobs and has_next else None,
            "hasMore": has_next,
            "duplicatesMergedCount": 0,
        },
        "fromCache": False,
    }

    # Cache for 60 seconds
    cache.set(cache_key, response_data, ttl=60)
    return response_data


@app.get("/api/v1/jobs/{job_id}")
async def get_job(job_id: str):
    """
    Get full details for a single job opening by its unique ID.
    Used when opening a dedicated job view page.
    """
    cache_key = f"job:{job_id}"
    cached_job = cache.get(cache_key)
    if cached_job is not None:
        return cached_job

    job = get_job_by_id(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job opening not found.")

    cache.set(cache_key, job, ttl=300)
    return job


@app.post("/api/v1/jobs/{job_id}/report-dead")
async def report_dead(job_id: str, body: ReportDeadRequest):
    """Report a dead or expired job listing in DB."""
    count = report_job_dead_in_db(job_id)
    cache.invalidate_all()
    return {
        "success": True,
        "message": "Report submitted. Listing will be de-indexed if confirmed unreachable.",
        "reportCount": count,
    }


# ── Authentication & Sudo User ────────────────────────────────────────────────

_SAVED_JOBS: set[str] = set()

@app.post("/api/v1/auth/login")
async def login(credentials: LoginRequest):
    """
    Login endpoint. Sudo user: admin / admin.
    Existing user skips onboarding directly to the dashboard.
    """
    u = credentials.username.strip().lower()
    p = credentials.password.strip()

    if u == "admin" and p == "admin":
        return {
            "success": True,
            "user": {
                "id": "usr_sudo_admin",
                "username": "admin",
                "name": "Admin (Sudo)",
                "email": "admin@hireme.dev",
                "role": "admin",
                "onboardingCompleted": True,
            },
            "message": "Sudo login successful. Bypassing onboarding.",
        }

    # Demo user registration / login
    if len(u) >= 2 and len(p) >= 2:
        return {
            "success": True,
            "user": {
                "id": f"usr_{u}",
                "username": u,
                "name": u.capitalize(),
                "email": f"{u}@hireme.dev",
                "role": "user",
                "onboardingCompleted": False,
            },
            "message": "Welcome! Please complete your onboarding survey.",
        }

    raise HTTPException(status_code=401, detail="Invalid username or password.")


@app.get("/api/v1/user/saved-jobs")
async def get_saved_jobs():
    saved = []
    for jid in _SAVED_JOBS:
        j = get_job_by_id(jid)
        if j:
            saved.append(j)
    return {"data": saved, "count": len(saved)}


@app.post("/api/v1/user/saved-jobs/{job_id}", status_code=status.HTTP_201_CREATED)
async def save_job(job_id: str):
    _SAVED_JOBS.add(job_id)
    return {"success": True, "savedJobIds": list(_SAVED_JOBS)}


@app.delete("/api/v1/user/saved-jobs/{job_id}")
async def unsave_job(job_id: str):
    _SAVED_JOBS.discard(job_id)
    return {"success": True, "savedJobIds": list(_SAVED_JOBS)}


# ── Profile Dashboard & Resume Match Engine (Requirements 2, 5, 8) ───────────

class ProfileUpdateRequest(BaseModel):
    firstName: str | None = None
    lastName: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    citizenship: str | None = None
    workAuthorization: str | None = None
    currentTitle: str | None = None
    yearsOfExperience: int | None = None
    linkedinUrl: str | None = None
    githubUrl: str | None = None
    portfolioUrl: str | None = None
    leetcodeUrl: str | None = None
    codeforcesUrl: str | None = None
    bestProjects: list[dict[str, Any]] | None = None
    visaSponsorship: str | None = None
    militaryVeteranStatus: str | None = None
    governmentEmployee: str | None = None
    gender: str | None = None
    raceEthnicity: str | None = None
    disabilityStatus: str | None = None
    resumeFileName: str | None = None
    resumeText: str | None = None
    resumeSkills: list[str] | None = None
    preferences: dict[str, Any] | None = None


class ResumeParseRequest(BaseModel):
    resumeText: str
    fileName: str | None = "uploaded_resume.txt"
    username: str = "admin"


class AddLinkRequest(BaseModel):
    url: str


@app.get("/api/v1/user/profile")
async def get_user_profile_endpoint(username: str = "admin"):
    """Fetch complete user profile, citizenship, contact, links, and resume skills."""
    return get_or_create_user_profile(username=username)


@app.put("/api/v1/user/profile")
async def update_user_profile_endpoint(body: ProfileUpdateRequest, username: str = "admin"):
    """Update profile information, links, work authorization, or resume skills."""
    data = body.model_dump(exclude_unset=True)
    updated = update_user_profile(username=username, data=data)
    cache.invalidate_all()
    return updated


@app.post("/api/v1/resume/parse")
async def parse_resume_endpoint(payload: ResumeParseRequest):
    """
    Parse resume text to extract technical skills and automatically update the user's profile and onboarding preferences.
    """
    analysis = analyze_resume_text(payload.resumeText)
    current_profile = get_or_create_user_profile(username=payload.username)
    prefs = current_profile.get("preferences", {})

    # Auto-update onboarding criteria based on extracted resume skills
    prefs["primaryTechStack"] = analysis["allSkills"][:8]
    prefs["experienceLevels"] = [analysis["inferredSeniority"]]
    if analysis["suggestedRoles"]:
        prefs["targetRoles"] = analysis["suggestedRoles"]

    update_data = {
        "resumeFileName": payload.fileName or "resume.pdf",
        "resumeText": payload.resumeText,
        "resumeSkills": analysis["allSkills"],
        "yearsOfExperience": analysis["experienceYears"],
        "preferences": prefs,
    }
    updated_profile = update_user_profile(username=payload.username, data=update_data)
    cache.invalidate_all()
    return {
        "success": True,
        "fileName": payload.fileName,
        "extractedSkills": analysis["allSkills"],
        "languages": analysis["languages"],
        "frameworks": analysis["frameworks"],
        "experienceYears": analysis["experienceYears"],
        "inferredSeniority": analysis["inferredSeniority"],
        "suggestedRoles": analysis["suggestedRoles"],
        "profile": updated_profile,
    }


@app.post("/api/v1/resume/upload")
async def upload_resume_file(
    file: UploadFile = File(...),
    username: str = Form("admin"),
):
    """Handle resume file upload (PDF, TXT, DOCX), extract text with pypdf, and auto-update onboarding preferences."""
    content = await file.read()
    filename = file.filename or "resume.pdf"
    text = ""

    if filename.lower().endswith(".pdf"):
        text = extract_text_from_pdf(content)
    else:
        try:
            text = content.decode("utf-8", errors="ignore")
        except Exception:
            text = ""

    analysis = analyze_resume_text(text)
    current_profile = get_or_create_user_profile(username=username)
    prefs = current_profile.get("preferences", {})

    # Auto-update onboarding preferences from resume
    prefs["primaryTechStack"] = analysis["allSkills"][:8]
    prefs["experienceLevels"] = [analysis["inferredSeniority"]]
    if analysis["suggestedRoles"]:
        prefs["targetRoles"] = analysis["suggestedRoles"]

    update_data = {
        "resumeFileName": filename,
        "resumeText": text[:15000],
        "resumeSkills": analysis["allSkills"],
        "yearsOfExperience": analysis["experienceYears"],
        "preferences": prefs,
    }
    updated_profile = update_user_profile(username=username, data=update_data)
    cache.invalidate_all()
    return {
        "success": True,
        "fileName": filename,
        "extractedSkills": analysis["allSkills"],
        "languages": analysis["languages"],
        "frameworks": analysis["frameworks"],
        "experienceYears": analysis["experienceYears"],
        "inferredSeniority": analysis["inferredSeniority"],
        "suggestedRoles": analysis["suggestedRoles"],
        "profile": updated_profile,
    }


# ── Admin Scraper Monitoring & Live Operations (Requirement 1) ────────────────

@app.get("/api/v1/admin/scraper/status")
async def get_admin_scraper_status():
    """Admin live scraper monitor telemetry, schedules, and live logs."""
    active_urls = read_links()
    active_sites_data = []
    available_comps = {c["name"].lower(): c["count"] for c in get_available_companies()}

    for url in active_urls:
        stat = worker_telemetry.site_statuses.get(url, {})
        comp_name = stat.get("company") or urlparse(url).netloc
        active_sites_data.append({
            "url": url,
            "company": comp_name,
            "status": stat.get("status", "idle"),
            "lastScrapedAt": stat.get("lastScrapedAt") or (worker_telemetry.last_sync.isoformat() if worker_telemetry.last_sync else None),
            "lastNewJobs": stat.get("lastNewJobs", 0),
            "totalFound": stat.get("totalFound", 0),
            "durationMs": stat.get("durationMs", 0),
            "totalInDb": available_comps.get(comp_name.lower(), 10),
        })

    return {
        "isScrapingNow": worker_telemetry.is_scraping_now,
        "lastSync": worker_telemetry.last_sync.isoformat() if worker_telemetry.last_sync else None,
        "nextSync": worker_telemetry.next_sync.isoformat() if worker_telemetry.next_sync else None,
        "secondsUntilNextSync": worker_telemetry.seconds_until_next_sync(),
        "totalScrapedAllTime": worker_telemetry.total_scraped_all_time,
        "lastCycleNewJobs": worker_telemetry.last_cycle_new_jobs,
        "activeSitesCount": len(active_urls),
        "activeSites": active_sites_data,
        "recentLogs": worker_telemetry.get_recent_logs(limit=60),
    }


@app.post("/api/v1/admin/scraper/trigger")
async def trigger_admin_scraper():
    """Trigger an immediate live scraping sweep across all career portals."""
    if worker_telemetry.is_scraping_now:
        return {"success": False, "message": "Scrape cycle is currently running in background."}

    # Run scraping and return summary
    result = await scrape_all_sites(is_manual=True)
    return {
        "success": True,
        "message": f"Live scrape complete! +{result['totalNew']} new jobs added to database.",
        "details": result,
        "secondsUntilNextSync": 300,
        "nextSync": worker_telemetry.next_sync.isoformat() if worker_telemetry.next_sync else None,
    }


@app.post("/api/v1/admin/scraper/add-link")
async def add_admin_scraper_link(payload: AddLinkRequest):
    """Add a career website URL to the scraping pipeline."""
    res = add_career_link(payload.url)
    if res.get("status") == "active":
        # Kick off a live scrape for the newly recognized portal
        asyncio.create_task(scrape_all_sites(is_manual=True))
    return res


