"""
Netflix Careers Scraper Adapter
===============================
Source: https://explore.jobs.netflix.net/careers
API: https://explore.jobs.netflix.net/api/apply/v2/jobs?domain=netflix.com
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests

from models.job import JobSource, NormalizedJob, SalaryRange
from scrapers.base import BaseScraper, FilterMap, FilterOption, SearchFilters

log = logging.getLogger(__name__)

BASE_URL = "https://explore.jobs.netflix.net"
JOBS_API_URL = f"{BASE_URL}/api/apply/v2/jobs"


class NetflixJobsScraper(BaseScraper):
    site_name = "netflix"
    site_url = f"{BASE_URL}/careers"

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": f"{BASE_URL}/careers",
        })

    def get_filters(self) -> FilterMap:
        return FilterMap(
            categories=[
                FilterOption(id="Engineering", label="Engineering"),
                FilterOption(id="Data & Insights", label="Data & Insights"),
                FilterOption(id="Product", label="Product"),
                FilterOption(id="Marketing", label="Marketing"),
                FilterOption(id="Operations", label="Operations"),
            ],
            countries=[
                FilterOption(id="United States", label="United States"),
                FilterOption(id="India", label="India"),
                FilterOption(id="United Kingdom", label="United Kingdom"),
                FilterOption(id="Netherlands", label="Netherlands"),
            ],
            job_types=[
                FilterOption(id="full-time", label="Full-time"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        query = filters.keyword or ""
        num = min(20, filters.max_pages * 10)
        log.info("[Netflix] scrape_jobs query=%r num=%d", query, num)

        params: dict[str, Any] = {
            "domain": "netflix.com",
            "start": 0,
            "num": num,
        }
        if query:
            params["query"] = query
        if filters.country:
            params["location"] = filters.country

        try:
            resp = self._session.get(JOBS_API_URL, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("[Netflix] API request failed: %s", exc)
            return []

        positions = data.get("positions", [])
        log.info("[Netflix] Retrieved %d positions", len(positions))

        jobs: list[NormalizedJob] = []
        for p in positions:
            jobs.append(self._normalize(p))
        return jobs

    def _normalize(self, p: dict[str, Any]) -> NormalizedJob:
        pos_id = str(p.get("id") or p.get("ats_job_id") or "")
        title = p.get("name") or "Untitled Position"
        job_url = p.get("canonicalPositionUrl") or f"{BASE_URL}/careers/job/{pos_id}"
        scraped_now = datetime.now(timezone.utc).isoformat()

        # Location
        loc_str = p.get("location") or "Remote, United States"
        parts = [x.strip() for x in loc_str.split(",")]
        city = parts[0] if len(parts) > 0 else None
        country = parts[-1] if len(parts) > 1 else "USA"

        # Work setup
        loc_lower = loc_str.lower()
        title_lower = title.lower()
        work_opt = str(p.get("work_location_option") or "").lower()
        if "remote" in loc_lower or "remote" in work_opt:
            work_setup = "remote"
            is_remote = True
        elif "hybrid" in loc_lower or "hybrid" in work_opt:
            work_setup = "hybrid"
            is_remote = True
        else:
            work_setup = "on-site"
            is_remote = False

        # Experience level
        if any(w in title_lower for w in ("intern", "associate")):
            exp_level = "entry"
        elif any(w in title_lower for w in ("director", "vp", "head of")):
            exp_level = "executive"
        elif any(w in title_lower for w in ("lead", "staff", "architect", "manager", "5", "6")):
            exp_level = "lead"
        elif any(w in title_lower for w in ("senior", "sr.", "sr ", "4")):
            exp_level = "senior"
        else:
            exp_level = "mid"

        # Skills extraction from title and department
        skills = []
        dept = p.get("department") or ""
        for s in ["Python", "Java", "Go", "C++", "JavaScript", "TypeScript", "React", "Node.js", "AWS", "Streaming", "Distributed Systems", "Kubernetes", "Data"]:
            if s.lower() in (title_lower + " " + dept.lower()):
                skills.append(s)
        if not skills:
            skills = ["Distributed Systems", "Software Engineering"]

        desc = p.get("job_description") or f"Netflix position: {title} in {loc_str}. Department: {dept}."

        return NormalizedJob(
            id=f"nflx-{pos_id}",
            title=title,
            company_name="Netflix",
            company_domain="netflix.com",
            apply_url=job_url,
            sources=[JobSource(
                platform="company_site",
                url=job_url,
                source_job_id=pos_id,
                scraped_at=scraped_now,
            )],
            posted_at=scraped_now,
            description_markdown=desc,
            description_html=desc if "<p>" in desc else f"<p>{desc}</p>",
            skills=skills,
            salary=SalaryRange(),
            city=city,
            state=None,
            country=country,
            is_remote_eligible=is_remote,
            work_setup=work_setup,
            job_type="full-time",
            experience_level=exp_level,
            raw=p,
        )
