"""
Microsoft Careers Scraper Adapter
=================================
Source: https://apply.careers.microsoft.com/careers?
API: https://apply.careers.microsoft.com/api/pcsx/search?domain=microsoft.com
"""
from __future__ import annotations

import logging
import random
import time
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests

from models.job import JobSource, NormalizedJob, SalaryRange
from scrapers.base import BaseScraper, FilterMap, FilterOption, SearchFilters

log = logging.getLogger(__name__)

BASE_URL = "https://apply.careers.microsoft.com"
SEARCH_API_URL = f"{BASE_URL}/api/pcsx/search"


class MicrosoftJobsScraper(BaseScraper):
    site_name = "microsoft"
    site_url = f"{BASE_URL}/careers?"

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": f"{BASE_URL}/careers?",
            "Origin": BASE_URL,
            "Accept": "application/json, text/plain, */*",
        })
        self._initialised = False

    def _ensure_session(self) -> None:
        if self._initialised:
            return
        try:
            resp = self._session.get(f"{BASE_URL}/careers?", timeout=15)
            resp.raise_for_status()
            self._initialised = True
        except Exception as exc:
            log.warning("[Microsoft] Warm-up GET warning: %s", exc)
            self._initialised = True

    def get_filters(self) -> FilterMap:
        return FilterMap(
            categories=[
                FilterOption(id="Software Engineering", label="Software Engineering"),
                FilterOption(id="Product Management", label="Product Management"),
                FilterOption(id="Data & Applied Sciences", label="Data & Applied Sciences"),
                FilterOption(id="Hardware Engineering", label="Hardware Engineering"),
                FilterOption(id="Research", label="Research"),
            ],
            countries=[
                FilterOption(id="United States", label="United States"),
                FilterOption(id="India", label="India"),
                FilterOption(id="United Kingdom", label="United Kingdom"),
                FilterOption(id="Germany", label="Germany"),
                FilterOption(id="Canada", label="Canada"),
            ],
            job_types=[
                FilterOption(id="full-time", label="Full-time"),
                FilterOption(id="internship", label="Internship"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        self._ensure_session()
        query = filters.keyword or "software"
        num = min(15, filters.max_pages * 10)
        log.info("[Microsoft] scrape_jobs query=%r num=%d", query, num)

        params: dict[str, Any] = {
            "domain": "microsoft.com",
            "query": query,
            "start": 0,
            "num": num,
        }
        if filters.country:
            params["location"] = filters.country

        try:
            resp = self._session.get(SEARCH_API_URL, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("[Microsoft] API request failed: %s", exc)
            return []

        positions = data.get("data", {}).get("positions", [])
        log.info("[Microsoft] Retrieved %d positions", len(positions))

        jobs: list[NormalizedJob] = []
        for p in positions:
            jobs.append(self._normalize(p))
        return jobs

    def _normalize(self, p: dict[str, Any]) -> NormalizedJob:
        pos_id = str(p.get("id") or p.get("displayJobId") or "")
        job_url = f"{BASE_URL}/careers/job/{pos_id}"
        apply_url = p.get("applyUrl") or job_url
        scraped_now = datetime.now(timezone.utc).isoformat()

        # Title
        title = p.get("name") or "Untitled Position"

        # Locations
        std_locs = p.get("standardizedLocations") or p.get("locations") or []
        loc_str = std_locs[0] if std_locs else "Remote, United States"
        parts = [x.strip() for x in loc_str.split(",")]
        city = parts[0] if len(parts) > 0 else None
        state = parts[1] if len(parts) > 2 else None
        country = parts[-1] if parts else "USA"

        # Work setup
        loc_lower = loc_str.lower()
        title_lower = title.lower()
        if "remote" in loc_lower or "up to 100% work from home" in loc_lower:
            work_setup = "remote"
            is_remote = True
        elif "hybrid" in loc_lower or "50%" in loc_lower:
            work_setup = "hybrid"
            is_remote = True
        else:
            work_setup = "on-site"
            is_remote = False

        # Experience level
        if any(w in title_lower for w in ("intern", "entry", "associate")):
            exp_level = "entry"
        elif any(w in title_lower for w in ("senior", "sr.", "sr ")):
            exp_level = "senior"
        elif any(w in title_lower for w in ("principal", "lead", "staff", "director", "partner")):
            exp_level = "lead"
        else:
            exp_level = "mid"

        # Skills extraction from title and profession
        skills = []
        prof = p.get("profession") or ""
        for s in ["C++", "C#", "Python", "Azure", "Cloud", "AI", "TypeScript", "React", "Distributed Systems"]:
            if s.lower() in (title_lower + " " + prof.lower()):
                skills.append(s)
        if not skills:
            skills = ["Cloud", "Software Engineering", "Azure"]

        desc = p.get("job_description") or p.get("description") or f"Microsoft position: {title} in {loc_str}."

        return NormalizedJob(
            id=f"msft-{pos_id}",
            title=title,
            company_name="Microsoft",
            company_domain="microsoft.com",
            apply_url=apply_url,
            sources=[JobSource(
                platform="company_site",
                url=job_url,
                source_job_id=pos_id,
                scraped_at=scraped_now,
            )],
            posted_at=scraped_now,
            description_markdown=desc,
            description_html=f"<p>{desc}</p>",
            skills=skills,
            salary=SalaryRange(),
            city=city,
            state=state,
            country=country,
            is_remote_eligible=is_remote,
            work_setup=work_setup,
            job_type="full-time",
            experience_level=exp_level,
            raw=p,
        )
