"""
Meta Careers Scraper Adapter
============================
Source: https://www.metacareers.com/jobsearch/?q=...
GraphQL: https://www.metacareers.com/graphql (CareersJobSearchResultsDataQuery doc_id: 27506805582236862)
"""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any

from curl_cffi import requests

from models.job import JobSource, NormalizedJob, SalaryRange
from scrapers.base import BaseScraper, FilterMap, FilterOption, SearchFilters

log = logging.getLogger(__name__)

GRAPHQL_URL = "https://www.metacareers.com/graphql"
DOC_ID = "27506805582236862"


class MetaJobsScraper(BaseScraper):
    site_name = "meta"
    site_url = "https://www.metacareers.com/jobsearch/"

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.metacareers.com/jobsearch/",
            "Origin": "https://www.metacareers.com",
        })
        self._lsd: str = ""

    def _ensure_session(self) -> None:
        if self._lsd:
            return
        try:
            r = self._session.get("https://www.metacareers.com/jobsearch/?q=engineer", timeout=15)
            m = re.search(r'\"LSD\",\[\],\{\"token\":\"([^\"]+)\"\}', r.text)
            if m:
                self._lsd = m.group(1)
                log.info("[Meta] Acquired LSD token: %s", self._lsd[:8])
        except Exception as exc:
            log.warning("[Meta] Failed to fetch LSD token: %s", exc)

    def get_filters(self) -> FilterMap:
        return FilterMap(
            categories=[
                FilterOption(id="Software Engineering", label="Software Engineering"),
                FilterOption(id="Artificial Intelligence", label="Artificial Intelligence"),
                FilterOption(id="Product Management", label="Product Management"),
                FilterOption(id="Infrastructure", label="Infrastructure"),
            ],
            countries=[
                FilterOption(id="United States", label="United States"),
                FilterOption(id="India", label="India"),
                FilterOption(id="United Kingdom", label="United Kingdom"),
                FilterOption(id="Singapore", label="Singapore"),
            ],
            job_types=[
                FilterOption(id="full-time", label="Full-time"),
                FilterOption(id="internship", label="Internship"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        self._ensure_session()
        query = filters.keyword or "engineer"
        log.info("[Meta] scrape_jobs query=%r", query)

        post_data = {
            "lsd": self._lsd or "AdTEdA5mMHJcTKnbRx-avG-rhmU",
            "doc_id": DOC_ID,
            "variables": json.dumps({"search_input": {"q": query}}),
        }

        try:
            resp = self._session.post(GRAPHQL_URL, data=post_data, timeout=15)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            log.error("[Meta] GraphQL query failed: %s", exc)
            return []

        all_jobs = data.get("data", {}).get("job_search_with_featured_jobs", {}).get("all_jobs", [])
        log.info("[Meta] Retrieved %d jobs from GraphQL", len(all_jobs))

        jobs: list[NormalizedJob] = []
        for item in all_jobs:
            jobs.append(self._normalize(item))

        limit = filters.max_pages * 10
        return jobs[:limit]

    def _normalize(self, item: dict[str, Any]) -> NormalizedJob:
        job_id = str(item.get("id") or "")
        title = item.get("title") or "Untitled Position"
        job_url = f"https://www.metacareers.com/jobs/{job_id}/"
        scraped_now = datetime.now(timezone.utc).isoformat()

        locations = item.get("locations") or []
        loc_str = locations[0] if locations else "Remote, United States"
        parts = [p.strip() for p in loc_str.split(",")]
        city = parts[0] if parts else None
        country = parts[-1] if len(parts) > 1 else "USA"

        title_lower = title.lower()
        loc_lower = loc_str.lower()
        if "remote" in loc_lower or "remote" in title_lower:
            work_setup = "remote"
            is_remote = True
        elif "hybrid" in loc_lower:
            work_setup = "hybrid"
            is_remote = True
        else:
            work_setup = "on-site"
            is_remote = False

        if any(w in title_lower for w in ("intern", "university", "fellow")):
            exp_level = "entry"
        elif any(w in title_lower for w in ("director", "vp", "head of")):
            exp_level = "executive"
        elif any(w in title_lower for w in ("staff", "lead", "manager", "principal")):
            exp_level = "lead"
        elif any(w in title_lower for w in ("senior", "sr.")):
            exp_level = "senior"
        else:
            exp_level = "mid"

        teams = item.get("teams") or []
        sub_teams = item.get("sub_teams") or []
        team_str = ", ".join(teams + sub_teams)

        skills = []
        for s in ["PyTorch", "Python", "C++", "Rust", "React", "AI", "LLM", "Distributed Systems", "Machine Learning"]:
            if s.lower() in (title_lower + " " + team_str.lower()):
                skills.append(s)
        if not skills:
            skills = ["AI / Machine Learning", "Distributed Systems", "Meta Platforms"]

        desc = f"Meta role on the {team_str} team located in {loc_str}. Explore pioneering technologies across AI, Reality Labs, and Family of Apps."

        return NormalizedJob(
            id=f"meta-{job_id}",
            title=title,
            company_name="Meta",
            company_domain="metacareers.com",
            apply_url=job_url,
            sources=[JobSource(
                platform="company_site",
                url=job_url,
                source_job_id=job_id,
                scraped_at=scraped_now,
            )],
            posted_at=scraped_now,
            description_markdown=desc,
            description_html=f"<p>{desc}</p>",
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
