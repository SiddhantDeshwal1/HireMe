"""
Uber Careers Scraper Adapter
============================
Source: https://jobs.uber.com/en/jobs/
API: https://jobs.uber.com/api/jobs/search/
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests

from models.job import JobSource, NormalizedJob, SalaryRange
from scrapers.base import BaseScraper, FilterMap, FilterOption, SearchFilters

log = logging.getLogger(__name__)

BASE_URL = "https://jobs.uber.com"
SEARCH_API = f"{BASE_URL}/api/jobs/search/"


class UberJobsScraper(BaseScraper):
    site_name = "uber"
    site_url = f"{BASE_URL}/en/jobs/"

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept": "application/json, text/plain, */*",
            "Referer": f"{BASE_URL}/en/jobs/",
        })

    def get_filters(self) -> FilterMap:
        return FilterMap(
            categories=[
                FilterOption(id="Engineering", label="Engineering"),
                FilterOption(id="Product", label="Product"),
                FilterOption(id="Operations", label="Operations"),
                FilterOption(id="Sales", label="Sales"),
            ],
            countries=[
                FilterOption(id="United States", label="United States"),
                FilterOption(id="India", label="India"),
                FilterOption(id="Netherlands", label="Netherlands"),
            ],
            job_types=[
                FilterOption(id="Full time", label="Full-time"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        query = filters.keyword or "software"
        params = {
            "q": query,
            "page": 1,
            "limit": min(20, filters.max_pages * 10),
        }
        log.info("[Uber] scrape_jobs params=%s", params)

        try:
            resp = self._session.get(SEARCH_API, params=params, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("[Uber] API request failed: %s", exc)
            return []

        raw_jobs = data.get("jobs", [])
        log.info("[Uber] Retrieved %d jobs", len(raw_jobs))

        jobs: list[NormalizedJob] = []
        for item in raw_jobs:
            jobs.append(self._normalize(item))
        return jobs

    def _normalize(self, item: dict[str, Any]) -> NormalizedJob:
        job_id = str(item.get("Id") or item.get("id") or "")
        title = item.get("Title") or "Untitled Position"
        urls = item.get("Urls") or []
        rel_url = urls[0].get("Url") if urls else f"/en/jobs/{job_id}/"
        apply_url = f"{BASE_URL}{rel_url}"
        scraped_now = datetime.now(timezone.utc).isoformat()

        # Location
        locs = item.get("Locations") or []
        city = None
        country = "USA"
        if locs:
            first_loc = locs[0]
            city = first_loc.get("City")
            country = first_loc.get("Country") or "USA"

        # Remote / Work setup
        is_remote = bool(item.get("Remote"))
        title_lower = title.lower()
        if is_remote or "remote" in title_lower:
            work_setup = "remote"
            is_remote = True
        elif "hybrid" in title_lower:
            work_setup = "hybrid"
            is_remote = True
        else:
            work_setup = "on-site"

        # Experience level
        exp_raw = str(item.get("ExperienceLevel") or "").lower()
        if any(w in title_lower for w in ("intern", "entry")) or "entry" in exp_raw:
            exp_level = "entry"
        elif any(w in title_lower for w in ("director", "vp", "head of")):
            exp_level = "executive"
        elif any(w in title_lower for w in ("staff", "principal", "lead", "manager")):
            exp_level = "lead"
        elif any(w in title_lower for w in ("senior", "sr.")):
            exp_level = "senior"
        else:
            exp_level = "mid"

        # Skills
        desc_html = item.get("Description") or item.get("Summary") or f"Uber role: {title}"
        skills = []
        for s in ["Go", "Java", "Python", "Kubernetes", "Kafka", "Distributed Systems", "Microservices", "React", "Mobile"]:
            if s.lower() in (title_lower + " " + desc_html.lower()):
                skills.append(s)
        if not skills:
            skills = ["Distributed Systems", "Microservices", "Mobility Platforms"]

        return NormalizedJob(
            id=f"uber-{job_id}",
            title=title,
            company_name="Uber",
            company_domain="uber.com",
            apply_url=apply_url,
            sources=[JobSource(
                platform="company_site",
                url=apply_url,
                source_job_id=job_id,
                scraped_at=scraped_now,
            )],
            posted_at=scraped_now,
            description_markdown=desc_html,
            description_html=desc_html,
            skills=skills,
            salary=SalaryRange(),
            city=city,
            state=None,
            country=country,
            is_remote_eligible=is_remote,
            work_setup=work_setup,
            job_type="full-time",
            experience_level=exp_level,
            raw=item,
        )
