"""
Amazon Jobs scraper adapter.

Discoveries (from reverse engineering):
- Correct endpoint: /en-gb/search.json  (NOT /api/v1/job_searches)
- Requires: CSRF token from <meta name="csrf-token"> in homepage HTML
- Requires: Session cookie from warm-up GET to /en-gb/search
- Category filter param: job_category[]  (identifier, e.g. 'software-development')
- Country filter param: country[]  (3-letter code: 'USA', 'GBR', 'IND', etc.)
- Sort: sort=relevant or sort=recent
- Category labels: embedded in React props as categories_cms JSON in the HTML
- Pagination: offset= (integer), result_limit=10 per page
"""
from __future__ import annotations

import html as html_mod
import json
import logging
import random
import re
import time
from datetime import datetime, timezone

from curl_cffi import requests

from models.job import JobSource, NormalizedJob, SalaryRange
from scrapers.base import BaseScraper, FilterMap, FilterOption, SearchFilters

log = logging.getLogger(__name__)

BASE_URL        = "https://www.amazon.jobs"
SEARCH_PAGE_URL = f"{BASE_URL}/en-gb/search"
SEARCH_JSON_URL = f"{BASE_URL}/en-gb/search.json"
PAGE_SIZE       = 10
DELAY_MIN       = 1.0
DELAY_MAX       = 4.0


class AmazonJobsScraper(BaseScraper):
    """
    Scraper for https://www.amazon.jobs.

    Two-phase:
      Phase 1 — get_filters(): Warm-up GET, extract CSRF + React props categories.
      Phase 2 — scrape_jobs(): Paginate /en-gb/search.json with filters.
    """

    site_name = "amazon"
    site_url  = SEARCH_PAGE_URL

    def __init__(self) -> None:
        self._session = requests.Session(impersonate="chrome120")
        self._session.headers.update({
            "User-Agent": (
                "Mozilla/5.0 (X11; Linux x86_64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "DNT": "1",
        })
        self._csrf_token: str = ""
        self._search_html: str = ""
        self._categories: list[FilterOption] = []
        self._initialised = False

    def _ensure_session(self) -> None:
        """Warm up the session once — get cookies + CSRF + category map."""
        if self._initialised:
            return

        log.info("[Amazon] Warming up session …")
        self._session.headers.update({
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        })
        try:
            resp = self._session.get(SEARCH_PAGE_URL, timeout=20)
            resp.raise_for_status()
            self._search_html = resp.text
        except Exception as exc:
            log.error("[Amazon] Warm-up failed: %s", exc)
            raise

        # Extract CSRF token
        m = re.search(r'<meta name="csrf-token" content="([^"]+)"', self._search_html)
        if m:
            self._csrf_token = m.group(1)
            log.info("[Amazon] CSRF token acquired.")
        else:
            log.warning("[Amazon] CSRF token not found.")

        # Switch to JSON API headers
        self._session.headers.update({
            "Accept":           "application/json, text/plain, */*",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-Token":     self._csrf_token,
            "Referer":          SEARCH_PAGE_URL,
            "Origin":           BASE_URL,
            "Sec-Fetch-Dest":   "empty",
            "Sec-Fetch-Mode":   "cors",
            "Sec-Fetch-Site":   "same-origin",
            "Connection":       "keep-alive",
        })

        # Parse categories from React props
        self._categories = self._parse_categories(self._search_html)
        log.info("[Amazon] %d job categories loaded.", len(self._categories))
        self._initialised = True

    @staticmethod
    def _parse_categories(html: str) -> list[FilterOption]:
        categories: list[FilterOption] = []
        for raw_attr in re.findall(r'data-react-props="([^"]+)"', html):
            try:
                obj = json.loads(html_mod.unescape(raw_attr))
            except (json.JSONDecodeError, ValueError):
                continue
            if "categories_cms" in obj:
                for title, meta in obj["categories_cms"].items():
                    categories.append(FilterOption(
                        id=meta.get("identifier", ""),
                        label=meta.get("title", title),
                    ))
        return sorted(categories, key=lambda c: c.label)

    def get_filters(self) -> FilterMap:
        self._ensure_session()
        return FilterMap(
            categories=self._categories,
            countries=[
                FilterOption(id="USA", label="United States"),
                FilterOption(id="GBR", label="United Kingdom"),
                FilterOption(id="IND", label="India"),
                FilterOption(id="DEU", label="Germany"),
                FilterOption(id="CAN", label="Canada"),
                FilterOption(id="AUS", label="Australia"),
            ],
            job_types=[
                FilterOption(id="full-time", label="Full-time"),
                FilterOption(id="contract",  label="Contract"),
                FilterOption(id="internship",label="Internship"),
            ],
        )

    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        self._ensure_session()
        log.info(
            "[Amazon] scrape_jobs  keyword=%r  category=%r  country=%r  pages=%d",
            filters.keyword, filters.category, filters.country, filters.max_pages,
        )

        # Auto-detect category ID if keyword looks like a category
        category_id = filters.category
        if not category_id and filters.keyword:
            kw_lower = filters.keyword.lower()
            for cat in self._categories:
                if kw_lower in cat.label.lower() or kw_lower in cat.id:
                    category_id = cat.id
                    log.info("[Amazon] Auto-mapped keyword→category: %s", category_id)
                    break

        jobs: list[NormalizedJob] = []
        for page in range(filters.max_pages):
            offset = page * PAGE_SIZE
            params: dict = {
                "result_limit": PAGE_SIZE,
                "offset":       offset,
                "sort":         filters.sort_by if filters.sort_by in ("relevant", "recent") else "relevant",
            }
            if category_id:
                params["job_category[]"] = category_id
            if filters.country:
                params["country[]"] = filters.country
            if filters.keyword and not category_id:
                params["normalized_keywords"] = filters.keyword

            log.info("[Amazon] Page %d (offset=%d) …", page + 1, offset)
            try:
                resp = self._session.get(SEARCH_JSON_URL, params=params, timeout=20)
                resp.raise_for_status()
                data = resp.json()
            except Exception as exc:
                log.error("[Amazon] Page %d failed: %s", page + 1, exc)
                break

            raw_jobs: list[dict] = data.get("jobs", [])
            if not raw_jobs:
                log.info("[Amazon] No more results at offset=%d.", offset)
                break

            for item in raw_jobs:
                jobs.append(self._normalize(item))

            log.info("[Amazon] Page %d: %d jobs (total=%d).", page + 1, len(raw_jobs), len(jobs))

            if page < filters.max_pages - 1:
                time.sleep(random.uniform(DELAY_MIN, DELAY_MAX))

        return jobs

    # ── Normalization ──────────────────────────────────────────────────────────

    def _normalize(self, item: dict) -> NormalizedJob:
        job_path = item.get("job_path") or ""
        job_url  = f"{BASE_URL}{job_path}" if job_path else item.get("url_next_step", "")
        apply_url = item.get("url_next_step") or job_url
        scraped_now = datetime.now(timezone.utc).isoformat()

        # Location
        city         = item.get("city") or None
        country_code = item.get("country_code") or "Unknown"
        location_str = (item.get("normalized_location") or "").lower()
        is_remote    = "remote" in location_str or "virtual" in location_str

        # Work setup inference
        title_desc = (item.get("title") or "").lower() + " " + (item.get("description_short") or "").lower()
        if "remote" in title_desc:
            work_setup = "remote"
        elif "hybrid" in title_desc:
            work_setup = "hybrid"
        else:
            work_setup = "on-site"

        # Experience level inference from title
        title_lower = (item.get("title") or "").lower()
        if any(w in title_lower for w in ("intern", "junior", "associate", "entry")):
            exp_level = "entry"
        elif any(w in title_lower for w in ("senior", "sr.", "sr ")):
            exp_level = "senior"
        elif any(w in title_lower for w in ("staff", "lead", "principal", "director")):
            exp_level = "lead"
        elif any(w in title_lower for w in ("vp", "vice president", "cto", "head of")):
            exp_level = "executive"
        else:
            exp_level = "mid"

        # Skills extraction (none available from Amazon API)
        skills: list[str] = []
        quals = item.get("basic_qualifications") or ""
        # Quick skill extraction from qualifications text
        for skill in ["Python", "Java", "Go", "C++", "JavaScript", "TypeScript",
                      "React", "AWS", "SQL", "Kubernetes", "Docker", "ML", "Rust"]:
            if skill.lower() in quals.lower():
                skills.append(skill)

        # Description
        desc_short = (item.get("description_short") or "").strip()
        desc_full  = (item.get("description") or desc_short).strip()
        basic_quals= (item.get("basic_qualifications") or "").strip()
        description_md = desc_full
        if basic_quals:
            description_md += f"\n\n### Basic Qualifications\n{basic_quals}"

        # Posted date
        posted_str = item.get("posted_date") or ""
        try:
            posted_at = datetime.strptime(posted_str.strip(), "%B %d, %Y").replace(tzinfo=timezone.utc).isoformat()
        except (ValueError, AttributeError):
            try:
                posted_at = datetime.strptime(posted_str.strip(), "%B  %d, %Y").replace(tzinfo=timezone.utc).isoformat()
            except (ValueError, AttributeError):
                posted_at = scraped_now

        return NormalizedJob(
            title             = item.get("title") or "Untitled",
            company_name      = "Amazon",
            company_domain    = "amazon.jobs",
            apply_url         = apply_url,
            sources           = [JobSource(
                platform      = "company_site",
                url           = job_url,
                source_job_id = str(item.get("id_icims") or item.get("id") or ""),
                scraped_at    = scraped_now,
            )],
            posted_at         = posted_at,
            description_markdown = description_md,
            description_html  = f"<p>{desc_short}</p>",
            skills            = skills,
            salary            = SalaryRange(),  # Amazon rarely posts salary
            city              = city,
            state             = None,
            country           = country_code,
            is_remote_eligible= is_remote,
            work_setup        = work_setup,
            job_type          = "full-time",
            experience_level  = exp_level,
            raw               = item,
        )
