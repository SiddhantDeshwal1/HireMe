"""
HireMe Background Worker & Live Telemetry Engine
================================================
Runs periodically every 5 minutes and supports on-demand live scraping,
structured activity logging for admin dashboards, live telemetry, and
dynamic career link ingestion.
"""
from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timedelta, timezone
import logging
from pathlib import Path
import random
import time
from typing import Any
from urllib.parse import urlparse

from scrapers import get_scraper_for_url, REGISTRY
from scrapers.base import SearchFilters
from models.job import NormalizedJob
from database import init_db, upsert_jobs, cleanup_expired_jobs, get_db_stats
from cache import cache

log = logging.getLogger(__name__)

SITES_DIR = Path(__file__).parent / "sites"
LINKS_FILE = SITES_DIR / "links.txt"
NEW_LINKS_FILE = SITES_DIR / "new_links.txt"
PERIOD_SECS = 300  # 5 minutes


# ── Activity Logger & Telemetry ───────────────────────────────────────────────

class ScraperLogEntry:
    def __init__(
        self,
        company: str,
        level: str,
        message: str,
        new_jobs: int = 0,
        total_scraped: int = 0,
        duration_ms: int = 0,
    ) -> None:
        self.id = f"log_{int(time.time() * 1000)}_{random.randint(100, 999)}"
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.company = company
        self.level = level  # 'info' | 'success' | 'warn' | 'error'
        self.message = message
        self.new_jobs = new_jobs
        self.total_scraped = total_scraped
        self.duration_ms = duration_ms

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "company": self.company,
            "level": self.level,
            "message": self.message,
            "newJobs": self.new_jobs,
            "totalScraped": self.total_scraped,
            "durationMs": self.duration_ms,
        }


class WorkerTelemetry:
    def __init__(self) -> None:
        self.last_sync: datetime | None = None
        self.next_sync: datetime | None = None
        self.total_scraped_all_time: int = 0
        self.scrapers_active: int = 0
        self.is_scraping_now: bool = False
        self.last_cycle_duration_secs: float = 0.0
        self.last_cycle_new_jobs: int = 0
        self.active_sites_count: int = 0
        self._logs: deque[dict[str, Any]] = deque(maxlen=200)
        self.site_statuses: dict[str, dict[str, Any]] = {}

    def log(
        self,
        company: str,
        level: str,
        message: str,
        new_jobs: int = 0,
        total_scraped: int = 0,
        duration_ms: int = 0,
    ) -> None:
        entry = ScraperLogEntry(company, level, message, new_jobs, total_scraped, duration_ms)
        self._logs.appendleft(entry.to_dict())
        log.info("[%s] %s", company.upper(), message)

    def get_recent_logs(self, limit: int = 50) -> list[dict[str, Any]]:
        return list(self._logs)[:limit]

    def seconds_until_next_sync(self) -> int:
        if not self.next_sync:
            return PERIOD_SECS
        now = datetime.now(timezone.utc)
        diff = int((self.next_sync - now).total_seconds())
        return max(0, diff)


worker_telemetry = WorkerTelemetry()


# ── Link Management ────────────────────────────────────────────────────────────

def read_links() -> list[str]:
    """Read active site URLs from links.txt."""
    if not LINKS_FILE.exists():
        log.warning("links.txt not found at %s", LINKS_FILE)
        return []
    lines = LINKS_FILE.read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.strip().startswith("#")]


def add_career_link(url: str) -> dict[str, Any]:
    """
    Add a new career site URL to the pipeline.
    If scraper adapter is recognized, adds to links.txt and triggers live scrape.
    Otherwise appends to new_links.txt for automated configuration.
    """
    cleaned = url.strip().strip('"').strip("'")
    if not cleaned.startswith("http://") and not cleaned.startswith("https://"):
        cleaned = f"https://{cleaned}"

    host = urlparse(cleaned).netloc.lower()
    is_known = host in REGISTRY

    if is_known:
        active_links = read_links()
        if cleaned not in active_links:
            LINKS_FILE.parent.mkdir(parents=True, exist_ok=True)
            with open(LINKS_FILE, "a", encoding="utf-8") as f:
                f.write(f"\n{cleaned}")
            worker_telemetry.log(
                "System", "success",
                f"Added recognized link {cleaned} directly to active scraping rotation."
            )
            return {
                "success": True,
                "status": "active",
                "message": f"Career site {host} recognized! Added to active links and scraping rotation.",
                "url": cleaned,
                "host": host,
            }
        return {
            "success": True,
            "status": "already_active",
            "message": f"Career site {host} is already in the active tracking rotation.",
            "url": cleaned,
            "host": host,
        }
    else:
        # Save to new_links.txt
        NEW_LINKS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(NEW_LINKS_FILE, "a", encoding="utf-8") as f:
            f.write(f"\n{cleaned}")
        worker_telemetry.log(
            "System", "info",
            f"Added new site {host} to new_links.txt for adapter configuration."
        )
        return {
            "success": True,
            "status": "pending_onboarding",
            "message": f"New site {host} queued in new_links.txt. Pipeline adapter mapping registered.",
            "url": cleaned,
            "host": host,
        }


# ── Scraping Execution ─────────────────────────────────────────────────────────

def _run_scraper_sync(url: str, filters: SearchFilters) -> tuple[list[NormalizedJob], str, int]:
    """
    Run a scraper synchronously in thread pool.
    Returns (jobs, site_name, duration_ms).
    """
    t0 = time.perf_counter()
    scraper = get_scraper_for_url(url)
    if scraper is None:
        log.warning("No scraper registered for URL: %s", url)
        return [], urlparse(url).netloc, 0
    try:
        jobs = scraper.scrape_jobs(filters)
        duration_ms = int((time.perf_counter() - t0) * 1000)
        return jobs, scraper.site_name, duration_ms
    except Exception as exc:
        duration_ms = int((time.perf_counter() - t0) * 1000)
        log.error("[%s] Scraper raised error: %s", scraper.site_name.upper(), exc)
        return [], scraper.site_name, duration_ms


async def scrape_all_sites(is_manual: bool = False) -> dict[str, Any]:
    """
    Scrape all sites in links.txt, update live telemetry, log results,
    and persist into SQLite with 5-day TTL.
    """
    urls = read_links()
    if not urls:
        log.warning("No active links in %s", LINKS_FILE)
        return {"totalNew": 0, "totalScraped": 0, "durationSecs": 0.0}

    start_time = time.time()
    worker_telemetry.is_scraping_now = True
    worker_telemetry.scrapers_active = len(urls)
    worker_telemetry.active_sites_count = len(urls)

    worker_telemetry.log(
        "Worker", "info",
        f"{'Manual live scrape' if is_manual else 'Scheduled scrape cycle'} initiated across {len(urls)} career portals."
    )

    filters = SearchFilters(keyword="engineer", max_pages=1)
    loop = asyncio.get_event_loop()
    total_new = 0
    total_scraped_cycle = 0

    for i, url in enumerate(urls, 1):
        parsed_comp = urlparse(url).netloc
        worker_telemetry.site_statuses[url] = {
            "url": url,
            "company": parsed_comp,
            "status": "scraping",
            "lastScrapedAt": datetime.now(timezone.utc).isoformat(),
        }

        jobs, site_name, duration_ms = await loop.run_in_executor(None, _run_scraper_sync, url, filters)
        new_count = 0
        if jobs:
            new_count = upsert_jobs(jobs, ttl_days=5)
            total_new += new_count
            total_scraped_cycle += len(jobs)
            worker_telemetry.total_scraped_all_time += len(jobs)
            worker_telemetry.log(
                site_name.capitalize(),
                "success",
                f"Scraped {len(jobs)} listings (+{new_count} new openings, {len(jobs) - new_count} merged) in {duration_ms}ms.",
                new_jobs=new_count,
                total_scraped=len(jobs),
                duration_ms=duration_ms,
            )
            worker_telemetry.site_statuses[url] = {
                "url": url,
                "company": site_name.capitalize(),
                "status": "success",
                "lastScrapedAt": datetime.now(timezone.utc).isoformat(),
                "lastNewJobs": new_count,
                "totalFound": len(jobs),
                "durationMs": duration_ms,
            }
        else:
            worker_telemetry.log(
                site_name.capitalize(),
                "warn",
                f"Scraper returned 0 openings or timed out in {duration_ms}ms.",
                duration_ms=duration_ms,
            )
            worker_telemetry.site_statuses[url] = {
                "url": url,
                "company": site_name.capitalize(),
                "status": "idle",
                "lastScrapedAt": datetime.now(timezone.utc).isoformat(),
                "lastNewJobs": 0,
                "totalFound": 0,
                "durationMs": duration_ms,
            }

        # Polite jitter between career endpoints
        if i < len(urls):
            await asyncio.sleep(random.uniform(0.4, 1.2))

    # Invalidate query cache so users immediately see fresh openings
    if total_new > 0:
        cache.invalidate_all()

    # Clean up expired jobs
    cleanup_expired_jobs()

    now = datetime.now(timezone.utc)
    duration_secs = round(time.time() - start_time, 2)
    worker_telemetry.is_scraping_now = False
    worker_telemetry.scrapers_active = 0
    worker_telemetry.last_sync = now
    worker_telemetry.next_sync = now + timedelta(seconds=PERIOD_SECS)
    worker_telemetry.last_cycle_duration_secs = duration_secs
    worker_telemetry.last_cycle_new_jobs = total_new

    worker_telemetry.log(
        "Worker", "success",
        f"Cycle completed in {duration_secs}s. Total scraped: {total_scraped_cycle} (+{total_new} new). Next sync in 5m.",
        new_jobs=total_new,
        total_scraped=total_scraped_cycle,
        duration_ms=int(duration_secs * 1000),
    )

    return {
        "totalNew": total_new,
        "totalScraped": total_scraped_cycle,
        "durationSecs": duration_secs,
        "sitesScraped": len(urls),
    }


async def periodic_worker() -> None:
    """Async background loop running every 5 minutes."""
    log.info("HireMe periodic worker loop initialized. Interval: %ds.", PERIOD_SECS)
    init_db()

    # First initial scrape
    worker_telemetry.next_sync = datetime.now(timezone.utc) + timedelta(seconds=PERIOD_SECS)
    await scrape_all_sites()

    while True:
        try:
            log.info("== 5-Minute Periodic Scrape Cycle Starting ==")
            await scrape_all_sites()
        except Exception as exc:
            log.error("Periodic worker loop encountered error: %s", exc)
            worker_telemetry.log("Worker", "error", f"Scrape loop error: {exc}")

        await asyncio.sleep(PERIOD_SECS)
