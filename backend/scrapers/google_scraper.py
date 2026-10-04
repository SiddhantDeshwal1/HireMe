"""
Google Careers Scraper Adapter
==============================
Source: https://www.google.com/about/careers/applications/jobs/results
Parses embedded AF_initDataCallback from https://careers.google.com/jobs/results/?q=...
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

BASE_URL = "https://careers.google.com"


class GoogleJobsScraper(BaseScraper):
    site_name = "google"
    site_url = "https://www.google.com/about/careers/applications/jobs/results"

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
        })

    def get_filters(self) -> FilterMap:
        return FilterMap(
            categories=[
                FilterOption(id="software", label="Software Engineering"),
                FilterOption(id="product", label="Product Management"),
                FilterOption(id="cloud", label="Google Cloud"),
                FilterOption(id="ai", label="AI & Machine Learning"),
            ],
            countries=[
                FilterOption(id="USA", label="United States"),
                FilterOption(id="IND", label="India"),
                FilterOption(id="GBR", label="United Kingdom"),
                FilterOption(id="DEU", label="Germany"),
            ],
            job_types=[
                FilterOption(id="full-time", label="Full-time"),
                FilterOption(id="internship", label="Internship"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        query = filters.keyword or "software"
        target_url = f"{BASE_URL}/jobs/results/?q={query}&page=1"
        log.info("[Google] scrape_jobs fetching %s", target_url)

        try:
            resp = self._session.get(target_url, timeout=20)
            resp.raise_for_status()
            html = resp.text
        except Exception as exc:
            log.error("[Google] Page request failed: %s", exc)
            return []

        # Parse AF_initDataCallback with job data (ds:1)
        raw_jobs = []
        for cb in re.findall(r"AF_initDataCallback\((.*?)\);", html, re.DOTALL):
            if "ds:1" in cb and "data:" in cb:
                pos = cb.find("data:")
                if pos != -1:
                    raw = cb[pos + 5:].strip()
                    end = raw.rfind("]")
                    if end != -1:
                        try:
                            parsed = json.loads(raw[:end + 1])
                            if parsed and isinstance(parsed, list) and isinstance(parsed[0], list):
                                raw_jobs = parsed[0]
                                break
                        except Exception as e:
                            log.debug("[Google] Callback parse failed: %s", e)

        log.info("[Google] Parsed %d raw items", len(raw_jobs))
        jobs: list[NormalizedJob] = []
        for item in raw_jobs:
            if isinstance(item, list) and len(item) > 2 and item[0] and item[1]:
                if str(item[0]).isdigit():
                    jobs.append(self._normalize(item))

        limit = filters.max_pages * 10
        return jobs[:limit]

    def _normalize(self, item: list[Any]) -> NormalizedJob:
        job_id = str(item[0])
        title = str(item[1])
        apply_url = str(item[2]) if len(item) > 2 and item[2] else f"https://www.google.com/about/careers/applications/jobs/results/{job_id}"
        canonical_url = f"https://www.google.com/about/careers/applications/jobs/results/{job_id}"
        scraped_now = datetime.now(timezone.utc).isoformat()

        # Location: item[9] is list of [[loc_str, [loc_str], city, None, state, country_code]]
        loc_str = "Remote, USA"
        city = None
        state = None
        country = "USA"
        if len(item) > 9 and isinstance(item[9], list) and item[9]:
            first_loc = item[9][0]
            if isinstance(first_loc, list):
                loc_str = first_loc[0] if len(first_loc) > 0 else loc_str
                city = first_loc[2] if len(first_loc) > 2 else None
                state = first_loc[4] if len(first_loc) > 4 else None
                country = first_loc[5] if len(first_loc) > 5 else "USA"

        # Descriptions
        desc_parts = []
        if len(item) > 10 and isinstance(item[10], list) and len(item[10]) > 1:
            desc_parts.append(str(item[10][1]))
        if len(item) > 3 and isinstance(item[3], list) and len(item[3]) > 1:
            desc_parts.append(f"### Responsibilities\n{item[3][1]}")
        if len(item) > 4 and isinstance(item[4], list) and len(item[4]) > 1:
            desc_parts.append(f"### Qualifications\n{item[4][1]}")
        desc_markdown = "\n\n".join(desc_parts) or f"Google role: {title} in {loc_str}."

        title_lower = title.lower()
        loc_lower = loc_str.lower()
        if "remote" in loc_lower or "remote" in title_lower:
            work_setup = "remote"
            is_remote = True
        elif "hybrid" in loc_lower or "hybrid" in title_lower:
            work_setup = "hybrid"
            is_remote = True
        else:
            work_setup = "on-site"
            is_remote = False

        if any(w in title_lower for w in ("intern", "student", "associate")):
            exp_level = "entry"
        elif any(w in title_lower for w in ("director", "vp", "head of")):
            exp_level = "executive"
        elif any(w in title_lower for w in ("staff", "principal", "lead", "manager")):
            exp_level = "lead"
        elif any(w in title_lower for w in ("senior", "sr.", "sr ", "iii")):
            exp_level = "senior"
        else:
            exp_level = "mid"

        # Skills
        skills = []
        for s in ["Python", "Java", "C++", "Go", "Kubernetes", "GCP", "Google Cloud", "Distributed Systems", "Machine Learning", "TensorFlow", "React", "TypeScript"]:
            if s.lower() in (title_lower + " " + desc_markdown.lower()):
                skills.append(s)
        if not skills:
            skills = ["Google Cloud", "Distributed Systems", "Algorithms"]

        return NormalizedJob(
            id=f"goog-{job_id}",
            title=title,
            company_name="Google",
            company_domain="google.com",
            apply_url=apply_url,
            sources=[JobSource(
                platform="company_site",
                url=canonical_url,
                source_job_id=job_id,
                scraped_at=scraped_now,
            )],
            posted_at=scraped_now,
            description_markdown=desc_markdown,
            description_html=f"<div>{desc_markdown}</div>",
            skills=skills,
            salary=SalaryRange(),
            city=city,
            state=state,
            country=country,
            is_remote_eligible=is_remote,
            work_setup=work_setup,
            job_type="full-time",
            experience_level=exp_level,
            raw={"raw_item": str(item[:5])},
        )
