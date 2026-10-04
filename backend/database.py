"""
HireMe SQLite Database Engine
=============================
Provides persistent storage with 5-day TTL, deduplication, indexed search,
resume skill-matching, company filtering, and full user profile storage.
"""
from __future__ import annotations

import json
import logging
import re
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from models.job import NormalizedJob

log = logging.getLogger(__name__)

DB_PATH = Path(__file__).parent / "hireme_jobs.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), timeout=25.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA cache_size=-64000;")  # 64MB cache for lightning queries
    conn.execute("PRAGMA temp_store=MEMORY;")
    conn.execute("PRAGMA mmap_size=268435456;")  # 256MB memory-mapped zero-copy I/O
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn


def init_db() -> None:
    with get_connection() as conn:
        # Jobs table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                slug TEXT,
                title TEXT NOT NULL,
                company_name TEXT NOT NULL,
                company_domain TEXT NOT NULL,
                company_id TEXT,
                company_logo_url TEXT,
                city TEXT,
                state TEXT,
                country TEXT,
                is_remote_eligible INTEGER DEFAULT 0,
                work_setup TEXT DEFAULT 'on-site',
                job_type TEXT DEFAULT 'full-time',
                experience_level TEXT DEFAULT 'mid',
                salary_min REAL,
                salary_max REAL,
                salary_currency TEXT DEFAULT 'USD',
                salary_interval TEXT DEFAULT 'yearly',
                salary_is_estimated INTEGER DEFAULT 0,
                description_markdown TEXT,
                description_html TEXT,
                skills_json TEXT DEFAULT '[]',
                sources_json TEXT DEFAULT '[]',
                posted_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                is_dead INTEGER DEFAULT 0,
                report_count INTEGER DEFAULT 0,
                apply_url TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                dedup_key TEXT NOT NULL
            );
        """)

        # User profiles table (Requirement 5 & 8)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_profiles (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                first_name TEXT DEFAULT '',
                last_name TEXT DEFAULT '',
                email TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                location TEXT DEFAULT '',
                citizenship TEXT DEFAULT '',
                work_authorization TEXT DEFAULT '',
                current_title TEXT DEFAULT '',
                years_of_experience INTEGER DEFAULT 0,
                linkedin_url TEXT DEFAULT '',
                github_url TEXT DEFAULT '',
                portfolio_url TEXT DEFAULT '',
                leetcode_url TEXT DEFAULT '',
                codeforces_url TEXT DEFAULT '',
                best_projects_json TEXT DEFAULT '[]',
                visa_sponsorship TEXT DEFAULT 'No',
                military_veteran_status TEXT DEFAULT 'I am not a veteran',
                government_employee TEXT DEFAULT 'No',
                gender TEXT DEFAULT 'Prefer not to say',
                race_ethnicity TEXT DEFAULT 'Prefer not to say',
                disability_status TEXT DEFAULT 'Prefer not to say',
                resume_file_name TEXT DEFAULT '',
                resume_text TEXT DEFAULT '',
                resume_skills_json TEXT DEFAULT '[]',
                preferences_json TEXT DEFAULT '{}',
                updated_at TEXT NOT NULL
            );
        """)

        # Automated schema migrations for existing databases
        existing_cols = {r["name"] for r in conn.execute("PRAGMA table_info(user_profiles)").fetchall()}
        new_cols = [
            ("leetcode_url", "TEXT DEFAULT ''"),
            ("codeforces_url", "TEXT DEFAULT ''"),
            ("best_projects_json", "TEXT DEFAULT '[]'"),
            ("visa_sponsorship", "TEXT DEFAULT 'No'"),
            ("military_veteran_status", "TEXT DEFAULT 'I am not a veteran'"),
            ("government_employee", "TEXT DEFAULT 'No'"),
            ("gender", "TEXT DEFAULT 'Prefer not to say'"),
            ("race_ethnicity", "TEXT DEFAULT 'Prefer not to say'"),
            ("disability_status", "TEXT DEFAULT 'Prefer not to say'"),
        ]
        for col_name, col_type in new_cols:
            if col_name not in existing_cols:
                conn.execute(f"ALTER TABLE user_profiles ADD COLUMN {col_name} {col_type};")

        # Performance Indexes for fast multi-filter queries
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_dedup ON jobs(dedup_key);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_work_setup ON jobs(work_setup);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_exp ON jobs(experience_level);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_posted ON jobs(posted_at DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_expires ON jobs(expires_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(is_dead, expires_at);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_active_posted ON jobs(is_dead, expires_at, posted_at DESC);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_active_comp ON jobs(is_dead, expires_at, company_name);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_jobs_active_salary ON jobs(is_dead, expires_at, salary_min);")
        conn.commit()
    log.info("SQLite database initialized at %s with WAL mode, mmap & 64MB cache", DB_PATH)


def upsert_job(job: NormalizedJob, ttl_days: int = 5) -> bool:
    """Insert or update a job with a 5-day TTL."""
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(days=ttl_days)).isoformat()
    now_iso = now.isoformat()

    with get_connection() as conn:
        cursor = conn.execute(
            "SELECT id, sources_json FROM jobs WHERE dedup_key = ? AND expires_at > ? LIMIT 1",
            (job.dedup_key(), now_iso)
        )
        row = cursor.fetchone()
        if row:
            existing_id = row["id"]
            existing_sources = json.loads(row["sources_json"] or "[]")
            existing_urls = {s.get("url") for s in existing_sources}

            new_sources = [s.to_dict() for s in job.sources if s.url not in existing_urls]
            if new_sources:
                merged = existing_sources + new_sources
                conn.execute(
                    "UPDATE jobs SET sources_json = ?, updated_at = ?, expires_at = ? WHERE id = ?",
                    (json.dumps(merged), now_iso, expires_at, existing_id)
                )
                conn.commit()
            return False

        conn.execute("""
            INSERT INTO jobs (
                id, slug, title, company_name, company_domain, company_id, company_logo_url,
                city, state, country, is_remote_eligible, work_setup, job_type, experience_level,
                salary_min, salary_max, salary_currency, salary_interval, salary_is_estimated,
                description_markdown, description_html, skills_json, sources_json,
                posted_at, updated_at, is_dead, report_count, apply_url,
                created_at, expires_at, dedup_key
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
                updated_at = excluded.updated_at,
                expires_at = excluded.expires_at,
                description_markdown = excluded.description_markdown,
                apply_url = excluded.apply_url
        """, (
            job.id,
            job.slug,
            job.title,
            job.company_name,
            job.company_domain,
            f"comp-{job.company_name.lower().replace(' ', '-')}",
            f"/logos/{job.company_name.lower().replace(' ', '')}.svg",
            job.city,
            job.state,
            job.country,
            1 if job.is_remote_eligible else 0,
            job.work_setup,
            job.job_type,
            job.experience_level,
            job.salary.min,
            job.salary.max,
            job.salary.currency,
            job.salary.interval,
            1 if job.salary.is_estimated else 0,
            job.description_markdown,
            job.description_html,
            json.dumps(job.skills),
            json.dumps([s.to_dict() for s in job.sources]),
            job.posted_at,
            now_iso,
            1 if job.is_dead else 0,
            job.report_count,
            job.apply_url,
            now_iso,
            expires_at,
            job.dedup_key(),
        ))
        conn.commit()
        return True


def upsert_jobs(jobs: list[NormalizedJob], ttl_days: int = 5) -> int:
    new_count = 0
    for job in jobs:
        if upsert_job(job, ttl_days=ttl_days):
            new_count += 1
    return new_count


def row_to_dict(row: sqlite3.Row, resume_skills: list[str] | None = None) -> dict[str, Any]:
    skills = json.loads(row["skills_json"] or "[]")
    sources = json.loads(row["sources_json"] or "[]")
    comp_clean = row["company_name"].lower().replace(" ", "").replace(".", "")
    logo_url = f"/logos/{comp_clean}.svg"

    # Compute resume match level if resume skills provided
    resume_score = 0
    matched_resume_skills: list[str] = []
    match_level = "Standard"

    if resume_skills and len(resume_skills) > 0 and len(skills) > 0:
        r_set = {s.lower().strip() for s in resume_skills}
        j_set = {s.lower().strip() for s in skills}
        overlap = r_set & j_set
        matched_resume_skills = [s for s in skills if s.lower().strip() in overlap]
        # Match percentage
        resume_score = min(100, int((len(overlap) / max(1, len(skills))) * 100))
        if resume_score >= 70 or len(overlap) >= 3:
            match_level = "Strong Match"
        elif resume_score >= 40 or len(overlap) >= 2:
            match_level = "Good Match"
        elif len(overlap) >= 1:
            match_level = "Moderate Match"

    official_job_id = ""
    if sources and len(sources) > 0:
        first_src = sources[0]
        official_job_id = str(first_src.get("sourceJobId") or first_src.get("source_job_id") or "")
    if not official_job_id:
        official_job_id = row["id"][:8].upper()

    return {
        "id": row["id"],
        "officialJobId": official_job_id,
        "slug": row["slug"],
        "title": row["title"],
        "company": {
            "id": row["company_id"] or f"comp-{comp_clean}",
            "name": row["company_name"],
            "logoUrl": logo_url,
            "websiteUrl": f"https://{row['company_domain']}",
            "isVerified": True,
            "domain": row["company_domain"],
        },
        "location": {
            "city": row["city"],
            "state": row["state"],
            "country": row["country"] or "USA",
            "isRemoteEligible": bool(row["is_remote_eligible"]),
        },
        "workSetup": row["work_setup"],
        "jobType": row["job_type"],
        "experienceLevel": row["experience_level"],
        "salary": {
            "min": row["salary_min"],
            "max": row["salary_max"],
            "currency": row["salary_currency"] or "USD",
            "interval": row["salary_interval"] or "yearly",
            "isEstimated": bool(row["salary_is_estimated"]),
        },
        "descriptionMarkdown": row["description_markdown"],
        "descriptionHtml": row["description_html"],
        "skills": skills,
        "sources": sources,
        "postedAt": row["posted_at"],
        "updatedAt": row["updated_at"],
        "isDead": bool(row["is_dead"]),
        "reportCount": row["report_count"],
        "applyUrl": row["apply_url"],
        "resumeMatchScore": resume_score,
        "resumeMatchLevel": match_level,
        "matchedResumeSkills": matched_resume_skills,
    }


def get_job_by_id(job_id: str) -> dict[str, Any] | None:
    with get_connection() as conn:
        cursor = conn.execute("SELECT * FROM jobs WHERE id = ? LIMIT 1", (job_id,))
        row = cursor.fetchone()
        if row:
            return row_to_dict(row)
    return None


def search_jobs_from_db(
    q: str | None = None,
    companies: list[str] | None = None,
    work_setups: list[str] | None = None,
    job_types: list[str] | None = None,
    experience_levels: list[str] | None = None,
    min_salary: int = 0,
    date_posted: str = "all",
    sort_by: str = "relevant",
    limit: int = 10,
    offset: int = 0,
    resume_skills: list[str] | None = None,
    match_resume: bool = False,
) -> tuple[list[dict[str, Any]], int]:
    """
    Search jobs strictly from SQLite database with filtering, resume scoring,
    and fast index-assisted queries.
    """
    clauses = ["is_dead = 0", "expires_at > ?"]
    now_iso = datetime.now(timezone.utc).isoformat()
    params: list[Any] = [now_iso]

    if q and q.strip():
        q_term = f"%{q.strip().lower()}%"
        clauses.append("(LOWER(title) LIKE ? OR LOWER(company_name) LIKE ? OR LOWER(description_markdown) LIKE ? OR LOWER(skills_json) LIKE ?)")
        params.extend([q_term, q_term, q_term, q_term])

    # Filter by Company (Requirement 1)
    if companies and len(companies) > 0:
        comp_clauses = []
        for comp in companies:
            if comp.lower() == "amazon":
                comp_clauses.append("(company_name LIKE '%Amazon%' OR company_name LIKE 'ADCI%' OR company_name LIKE 'ADSIPL%' OR company_name LIKE 'ASSPL%' OR company_name LIKE 'AWS%' OR company_name IN ('Annapurna Labs Ltd.', 'PillPack, LLC', 'Prime Now LLC', 'Prime Now LLC - E78'))")
            else:
                comp_clauses.append("(company_name = ? OR company_name LIKE ?)")
                params.extend([comp, f"{comp}%"])
        clauses.append(f"({' OR '.join(comp_clauses)})")

    if work_setups:
        placeholders = ",".join(["?"] * len(work_setups))
        clauses.append(f"work_setup IN ({placeholders})")
        params.extend(work_setups)

    if job_types:
        placeholders = ",".join(["?"] * len(job_types))
        clauses.append(f"job_type IN ({placeholders})")
        params.extend(job_types)

    if experience_levels:
        placeholders = ",".join(["?"] * len(experience_levels))
        clauses.append(f"experience_level IN ({placeholders})")
        params.extend(experience_levels)

    if min_salary > 0:
        clauses.append("(salary_min IS NULL OR salary_min >= ?)")
        params.append(min_salary)

    if date_posted != "all":
        hours = 24 if date_posted == "24h" else (7 * 24 if date_posted == "7d" else 30 * 24)
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        clauses.append("posted_at >= ?")
        params.append(cutoff)

    where_sql = " AND ".join(clauses)

    # Sorting
    if sort_by == "newest":
        order_sql = "ORDER BY posted_at DESC"
    elif sort_by == "salary":
        order_sql = "ORDER BY COALESCE(salary_min, 0) DESC, posted_at DESC"
    else:
        order_sql = "ORDER BY posted_at DESC"

    with get_connection() as conn:
        count_cursor = conn.execute(f"SELECT COUNT(*) as cnt FROM jobs WHERE {where_sql}", params)
        total_matching = count_cursor.fetchone()["cnt"]

        # Fetch candidate rows (if ranking by resume, fetch larger slice to re-rank in memory)
        if match_resume and resume_skills:
            paged_sql = f"SELECT * FROM jobs WHERE {where_sql} {order_sql} LIMIT 200"
            rows = conn.execute(paged_sql, params).fetchall()
            all_dicts = [row_to_dict(r, resume_skills=resume_skills) for r in rows]
            # Sort by resumeMatchScore descending
            all_dicts.sort(key=lambda j: (j["resumeMatchScore"], j["postedAt"]), reverse=True)
            jobs = all_dicts[offset: offset + limit]
        else:
            paged_sql = f"SELECT * FROM jobs WHERE {where_sql} {order_sql} LIMIT ? OFFSET ?"
            rows = conn.execute(paged_sql, params + [limit, offset]).fetchall()
            jobs = [row_to_dict(r, resume_skills=resume_skills) for r in rows]

    return jobs, total_matching


def get_available_companies() -> list[dict[str, Any]]:
    """Return distinct active companies with their live listing count."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute("""
            SELECT 
                CASE 
                    WHEN company_name LIKE '%Amazon%' OR company_name LIKE 'ADCI%' OR company_name LIKE 'ADSIPL%' OR company_name LIKE 'ASSPL%' OR company_name LIKE 'AWS%' OR company_name IN ('Annapurna Labs Ltd.', 'PillPack, LLC', 'Prime Now LLC', 'Prime Now LLC - E78') THEN 'Amazon'
                    WHEN company_name LIKE 'Google%' THEN 'Google'
                    WHEN company_name LIKE 'Microsoft%' THEN 'Microsoft'
                    WHEN company_name LIKE 'Meta%' THEN 'Meta'
                    WHEN company_name LIKE 'Netflix%' THEN 'Netflix'
                    WHEN company_name LIKE 'Uber%' THEN 'Uber'
                    WHEN company_name LIKE 'Rubrik%' THEN 'Rubrik'
                    ELSE company_name
                END AS canonical_name,
                COUNT(*) as job_count
            FROM jobs
            WHERE is_dead = 0 AND expires_at > ?
            GROUP BY canonical_name
            ORDER BY job_count DESC, canonical_name ASC
        """, (now_iso,))
        return [{"name": r["canonical_name"], "count": r["job_count"]} for r in cursor.fetchall()]


# ── User Profile Storage (Requirement 5 & 8) ───────────────────────────────────

def get_or_create_user_profile(username: str = "admin") -> dict[str, Any]:
    with get_connection() as conn:
        cursor = conn.execute("SELECT * FROM user_profiles WHERE username = ? LIMIT 1", (username,))
        row = cursor.fetchone()
        if row:
            keys = set(row.keys())
            first = row["first_name"] or "Admin"
            last = row["last_name"] or "User"
            return {
                "id": row["id"],
                "username": row["username"],
                "name": f"{first} {last}".strip(),
                "firstName": first,
                "lastName": last,
                "email": row["email"] or "admin@hireme.dev",
                "phone": row["phone"] or "+1 (555) 019-2834",
                "location": row["location"] or "San Francisco, CA",
                "citizenship": row["citizenship"] or "US Citizen",
                "workAuthorization": row["work_authorization"] or "Authorized to work for any employer",
                "currentTitle": row["current_title"] or "Senior Full Stack Engineer",
                "yearsOfExperience": row["years_of_experience"] or 6,
                "linkedinUrl": row["linkedin_url"] or "https://linkedin.com/in/hireme-admin",
                "githubUrl": row["github_url"] or "https://github.com/hireme-admin",
                "portfolioUrl": row["portfolio_url"] or "https://hireme.dev",
                "leetcodeUrl": (row["leetcode_url"] if "leetcode_url" in keys else "") or "https://leetcode.com/hireme-admin",
                "codeforcesUrl": (row["codeforces_url"] if "codeforces_url" in keys else "") or "https://codeforces.com/profile/hireme-admin",
                "bestProjects": json.loads(row["best_projects_json"] if "best_projects_json" in keys and row["best_projects_json"] else '[{"title": "High-Throughput Job Ingestion Engine", "skills": ["Python", "FastAPI", "SQLite", "curl_cffi"], "link": "https://github.com/hireme-admin/ingestion", "description": "Low-latency distributed crawler parsing multi-company job postings with 5-day caching and sub-millisecond querying."}]'),
                "visaSponsorship": (row["visa_sponsorship"] if "visa_sponsorship" in keys else "") or "No",
                "militaryVeteranStatus": (row["military_veteran_status"] if "military_veteran_status" in keys else "") or "I am not a veteran",
                "governmentEmployee": (row["government_employee"] if "government_employee" in keys else "") or "No",
                "gender": (row["gender"] if "gender" in keys else "") or "Prefer not to say",
                "raceEthnicity": (row["race_ethnicity"] if "race_ethnicity" in keys else "") or "Prefer not to say",
                "disabilityStatus": (row["disability_status"] if "disability_status" in keys else "") or "Prefer not to say",
                "resumeFileName": row["resume_file_name"] or "Alex_Rivera_Resume.pdf",
                "resumeText": row["resume_text"] or "",
                "resumeSkills": json.loads(row["resume_skills_json"] or '["Python", "Go", "TypeScript", "React", "AWS", "Distributed Systems", "Kubernetes", "PostgreSQL", "Docker", "Next.js"]'),
                "preferences": json.loads(row["preferences_json"] or "{}"),
                "updatedAt": row["updated_at"],
            }

        # Create default profile
        now_iso = datetime.now(timezone.utc).isoformat()
        default_skills = ["Python", "Go", "TypeScript", "React", "AWS", "Distributed Systems", "Kubernetes", "PostgreSQL", "Docker", "Next.js"]
        default_projects = [
            {
                "title": "High-Throughput Job Ingestion Engine",
                "skills": ["Python", "FastAPI", "SQLite", "curl_cffi"],
                "link": "https://github.com/hireme-admin/ingestion",
                "description": "Low-latency distributed crawler parsing multi-company job postings with 5-day caching and sub-millisecond querying."
            }
        ]
        conn.execute("""
            INSERT INTO user_profiles (
                id, username, first_name, last_name, email, phone, location,
                citizenship, work_authorization, current_title, years_of_experience,
                linkedin_url, github_url, portfolio_url, leetcode_url, codeforces_url,
                best_projects_json, visa_sponsorship, military_veteran_status,
                government_employee, gender, race_ethnicity, disability_status,
                resume_file_name, resume_text, resume_skills_json, preferences_json, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"usr_{username}", username, "Admin", "User", f"{username}@hireme.dev", "+1 (555) 019-2834", "San Francisco, CA",
            "US Citizen", "Authorized to work for any employer", "Senior Full Stack Engineer", 6,
            "https://linkedin.com/in/hireme-admin", "https://github.com/hireme-admin", "https://hireme.dev",
            "https://leetcode.com/hireme-admin", "https://codeforces.com/profile/hireme-admin",
            json.dumps(default_projects), "No", "I am not a veteran", "No", "Prefer not to say", "Prefer not to say", "Prefer not to say",
            "Alex_Rivera_Resume.pdf", "", json.dumps(default_skills), "{}", now_iso
        ))
        conn.commit()
        return get_or_create_user_profile(username)


def update_user_profile(username: str, data: dict[str, Any]) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute("""
            UPDATE user_profiles SET
                first_name = COALESCE(?, first_name),
                last_name = COALESCE(?, last_name),
                email = COALESCE(?, email),
                phone = COALESCE(?, phone),
                location = COALESCE(?, location),
                citizenship = COALESCE(?, citizenship),
                work_authorization = COALESCE(?, work_authorization),
                current_title = COALESCE(?, current_title),
                years_of_experience = COALESCE(?, years_of_experience),
                linkedin_url = COALESCE(?, linkedin_url),
                github_url = COALESCE(?, github_url),
                portfolio_url = COALESCE(?, portfolio_url),
                leetcode_url = COALESCE(?, leetcode_url),
                codeforces_url = COALESCE(?, codeforces_url),
                best_projects_json = COALESCE(?, best_projects_json),
                visa_sponsorship = COALESCE(?, visa_sponsorship),
                military_veteran_status = COALESCE(?, military_veteran_status),
                government_employee = COALESCE(?, government_employee),
                gender = COALESCE(?, gender),
                race_ethnicity = COALESCE(?, race_ethnicity),
                disability_status = COALESCE(?, disability_status),
                resume_file_name = COALESCE(?, resume_file_name),
                resume_text = COALESCE(?, resume_text),
                resume_skills_json = COALESCE(?, resume_skills_json),
                preferences_json = COALESCE(?, preferences_json),
                updated_at = ?
            WHERE username = ?
        """, (
            data.get("firstName"),
            data.get("lastName"),
            data.get("email"),
            data.get("phone"),
            data.get("location"),
            data.get("citizenship"),
            data.get("workAuthorization"),
            data.get("currentTitle"),
            data.get("yearsOfExperience"),
            data.get("linkedinUrl"),
            data.get("githubUrl"),
            data.get("portfolioUrl"),
            data.get("leetcodeUrl"),
            data.get("codeforcesUrl"),
            json.dumps(data["bestProjects"]) if "bestProjects" in data else None,
            data.get("visaSponsorship"),
            data.get("militaryVeteranStatus"),
            data.get("governmentEmployee"),
            data.get("gender"),
            data.get("raceEthnicity"),
            data.get("disabilityStatus"),
            data.get("resumeFileName"),
            data.get("resumeText"),
            json.dumps(data["resumeSkills"]) if "resumeSkills" in data else None,
            json.dumps(data["preferences"]) if "preferences" in data else None,
            now_iso,
            username,
        ))
        conn.commit()
    return get_or_create_user_profile(username)


def cleanup_expired_jobs() -> int:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        cursor = conn.execute("DELETE FROM jobs WHERE expires_at <= ?", (now_iso,))
        deleted = cursor.rowcount
        conn.commit()
    if deleted > 0:
        log.info("Cleaned up %d expired jobs from database.", deleted)
    return deleted


def report_job_dead_in_db(job_id: str) -> int:
    with get_connection() as conn:
        conn.execute("UPDATE jobs SET report_count = report_count + 1 WHERE id = ?", (job_id,))
        conn.execute("UPDATE jobs SET is_dead = 1 WHERE id = ? AND report_count >= 3", (job_id,))
        conn.commit()
        cursor = conn.execute("SELECT report_count FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        return row["report_count"] if row else 1


def get_db_stats() -> dict[str, Any]:
    with get_connection() as conn:
        total = conn.execute("SELECT COUNT(*) as c FROM jobs").fetchone()["c"]
        active = conn.execute("SELECT COUNT(*) as c FROM jobs WHERE is_dead = 0").fetchone()["c"]
        companies = conn.execute("SELECT COUNT(DISTINCT company_name) as c FROM jobs").fetchone()["c"]
    return {
        "totalJobsIndexed": total,
        "activeJobs": active,
        "uniqueCompanies": companies,
        "databaseEngine": "SQLite (WAL Mode + 64MB Cache)",
        "ttlDays": 5,
    }


def extract_skills_from_text(text: str) -> list[str]:
    """Extract standard technical skills from resume text using regex."""
    if not text:
        return []

    skill_patterns = [
        ("Python", r"\bpython\b"),
        ("JavaScript", r"\bjavascript\b"),
        ("TypeScript", r"\btypescript\b"),
        ("React", r"\breact(?:\.js)?\b"),
        ("Next.js", r"\bnext(?:\.js)?\b"),
        ("Node.js", r"\bnode(?:\.js)?\b"),
        ("Java", r"\bjava\b"),
        ("C++", r"(?:^|[^a-zA-Z0-9#+])c\+\+(?:[^a-zA-Z0-9#+]|$)"),
        ("C#", r"(?:^|[^a-zA-Z0-9#+])c#(?:[^a-zA-Z0-9#+]|$)"),
        ("Go", r"\b(?:golang|go)\b"),
        ("Rust", r"\brust\b"),
        ("AWS", r"\b(?:aws|amazon web services)\b"),
        ("GCP", r"\b(?:gcp|google cloud)\b"),
        ("Azure", r"\bazure\b"),
        ("Docker", r"\bdocker\b"),
        ("Kubernetes", r"\b(?:kubernetes|k8s)\b"),
        ("Terraform", r"\bterraform\b"),
        ("PostgreSQL", r"\b(?:postgres|postgresql)\b"),
        ("MySQL", r"\bmysql\b"),
        ("MongoDB", r"\bmongodb\b"),
        ("Redis", r"\bredis\b"),
        ("GraphQL", r"\bgraphql\b"),
        ("REST", r"\brest(?:ful)?\b"),
        ("SQL", r"\bsql\b"),
        ("Git", r"\bgit\b"),
        ("Linux", r"\blinux\b"),
        ("CI/CD", r"\bci\/cd\b"),
        ("Distributed Systems", r"\bdistributed systems\b"),
        ("Microservices", r"\bmicroservices\b"),
        ("Machine Learning", r"\b(?:machine learning|ml)\b"),
        ("Deep Learning", r"\bdeep learning\b"),
        ("PyTorch", r"\bpytorch\b"),
        ("TensorFlow", r"\btensorflow\b"),
    ]

    found: list[str] = []
    text_lower = text.lower()
    for name, pattern in skill_patterns:
        if re.search(pattern, text_lower, re.IGNORECASE):
            found.append(name)

    return found

