"""
Rubrik Careers Scraper Adapter
==============================
Source: https://www.rubrik.com/company/careers/departments/
API: https://boards-api.greenhouse.io/v1/boards/rubrik/jobs?content=true
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests

from models.job import JobSource, NormalizedJob, SalaryRange
from scrapers.base import BaseScraper, FilterMap, FilterOption, SearchFilters

log = logging.getLogger(__name__)

GREENHOUSE_API_URL = "https://boards-api.greenhouse.io/v1/boards/rubrik/jobs?content=true"


class RubrikJobsScraper(BaseScraper):
    site_name = "rubrik"
    site_url = "https://www.rubrik.com/company/careers/departments/"

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
        })

    def get_filters(self) -> FilterMap:
        return FilterMap(
            categories=[
                FilterOption(id="Engineering", label="Engineering"),
                FilterOption(id="Product Management", label="Product Management"),
                FilterOption(id="Sales", label="Sales"),
                FilterOption(id="Marketing", label="Marketing"),
            ],
            countries=[
                FilterOption(id="United States", label="United States"),
                FilterOption(id="India", label="India"),
            ],
            job_types=[
                FilterOption(id="full-time", label="Full-time"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        log.info("[Rubrik] scrape_jobs keyword=%r", filters.keyword)
        try:
            resp = self._session.get(GREENHOUSE_API_URL, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("[Rubrik] API request failed: %s", exc)
            return []

        raw_jobs = data.get("jobs", [])
        log.info("[Rubrik] Total jobs returned from Greenhouse: %d", len(raw_jobs))

        q_lower = (filters.keyword or "").lower()
        jobs: list[NormalizedJob] = []

        for item in raw_jobs:
            title = item.get("title") or ""
            content = item.get("content") or ""
            # Apply keyword filter in-memory if requested
            if q_lower and q_lower not in title.lower() and q_lower not in content.lower():
                continue
            jobs.append(self._normalize(item))

        limit = filters.max_pages * 10
        return jobs[:limit]

    def _normalize(self, item: dict[str, Any]) -> NormalizedJob:
        job_id = str(item.get("id") or "")
        title = item.get("title") or "Untitled Position"
        apply_url = item.get("absolute_url") or f"https://www.rubrik.com/company/careers/departments/job.{job_id}?gh_jid={job_id}"
        scraped_now = datetime.now(timezone.utc).isoformat()

        # Location
        loc_obj = item.get("location") or {}
        loc_name = loc_obj.get("name") if isinstance(loc_obj, dict) else str(loc_obj)
        parts = [p.strip() for p in (loc_name or "Palo Alto, CA, USA").split(",")]
        city = parts[0] if parts else None
        state = parts[1] if len(parts) > 2 else None
        country = parts[-1] if parts else "USA"

        # Work setup
        title_lower = title.lower()
        loc_lower = (loc_name or "").lower()
        if "remote" in loc_lower or "remote" in title_lower:
            work_setup = "remote"
            is_remote = True
        elif "hybrid" in loc_lower or "hybrid" in title_lower:
            work_setup = "hybrid"
            is_remote = True
        else:
            work_setup = "on-site"
            is_remote = False

        # Experience level
        if any(w in title_lower for w in ("intern", "associate", "entry")):
            exp_level = "entry"
        elif any(w in title_lower for w in ("staff", "lead", "principal", "director")):
            exp_level = "lead"
        elif any(w in title_lower for w in ("senior", "sr.", "sr ")):
            exp_level = "senior"
        else:
            exp_level = "mid"

        # Skills
        content_html = item.get("content") or ""
        skills = []
        for s in ["Go", "Python", "Java", "C++", "Distributed Systems", "Cloud Security", "Kubernetes", "AWS", "Azure", "Cybersecurity"]:
            if s.lower() in (title_lower + " " + content_html.lower()):
                skills.append(s)
        if not skills:
            skills = ["Cybersecurity", "Zero Trust", "Cloud"]

        posted_at = item.get("updated_at") or scraped_now

        return NormalizedJob(
            id=f"rbrk-{job_id}",
            title=title,
            company_name="Rubrik",
            company_domain="rubrik.com",
            apply_url=apply_url,
            sources=[JobSource(
                platform="greenhouse",
                url=apply_url,
                source_job_id=job_id,
                scraped_at=scraped_now,
            )],
            posted_at=posted_at,
            description_markdown=content_html,
            description_html=content_html,
            skills=skills,
            salary=SalaryRange(),
            city=city,
            state=state,
            country=country,
            is_remote_eligible=is_remote,
            work_setup=work_setup,
            job_type="full-time",
            experience_level=exp_level,
            raw=item,
        )
