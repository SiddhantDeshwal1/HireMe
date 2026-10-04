"""
Filter application logic.
Applies frontend JobFilters to a list of NormalizedJob objects.
"""
from __future__ import annotations
import re
from datetime import datetime, timedelta, timezone
from models.job import NormalizedJob
from scrapers.base import SearchFilters


def _hours_ago(dt_str: str) -> float:
    """Hours elapsed since a datetime string."""
    try:
        dt = datetime.fromisoformat(dt_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - dt).total_seconds() / 3600
    except (ValueError, TypeError):
        return float("inf")


def apply_filters(jobs: list[NormalizedJob], filters: SearchFilters) -> list[NormalizedJob]:
    """
    Filter a list of NormalizedJob objects using the given SearchFilters.
    Mirrors the client-side filter logic in frontend/src/lib/api.ts.
    """
    result = []
    for job in jobs:
        if job.is_dead:
            continue

        # ── Keyword search ────────────────────────────────────────────────────
        if filters.keyword:
            q = filters.keyword.lower()
            searchable = " ".join([
                job.title,
                job.company_name,
                job.description_markdown,
                " ".join(job.skills),
            ]).lower()
            if q not in searchable:
                continue

        # ── Work setup ────────────────────────────────────────────────────────
        if filters.work_setup:
            if job.work_setup not in filters.work_setup:
                continue

        # ── Job type ──────────────────────────────────────────────────────────
        if filters.job_type:
            if job.job_type not in filters.job_type:
                continue

        # ── Experience level ──────────────────────────────────────────────────
        if filters.experience_level:
            if job.experience_level not in filters.experience_level:
                continue

        # ── Min salary ────────────────────────────────────────────────────────
        if filters.min_salary > 0 and job.salary.min is not None:
            annual = job.salary.min * 2000 if job.salary.interval == "hourly" else job.salary.min
            if annual < filters.min_salary:
                continue

        # ── Date posted ───────────────────────────────────────────────────────
        if filters.date_posted != "all":
            hours = _hours_ago(job.posted_at)
            if filters.date_posted == "24h" and hours > 24:
                continue
            if filters.date_posted == "7d" and hours > 7 * 24:
                continue
            if filters.date_posted == "30d" and hours > 30 * 24:
                continue

        result.append(job)

    return result


def sort_jobs(
    jobs: list[NormalizedJob],
    sort_by: str,
    user_skills: list[str] | None = None,
) -> list[NormalizedJob]:
    """
    Sort jobs by the given criterion.
    - 'newest': by posted_at descending
    - 'salary': by salary.min descending (nulls last)
    - 'relevant': by match_score descending (basic skill overlap if no user prefs)
    """
    if sort_by == "newest":
        return sorted(jobs, key=lambda j: j.posted_at, reverse=True)

    if sort_by == "salary":
        def salary_key(j: NormalizedJob) -> float:
            if j.salary.min is None:
                return 0.0
            return j.salary.min * 2000 if j.salary.interval == "hourly" else j.salary.min
        return sorted(jobs, key=salary_key, reverse=True)

    # Default: 'relevant' — basic skill overlap with user stack
    if user_skills:
        user_set = {s.lower() for s in user_skills}
        def relevance_key(j: NormalizedJob) -> float:
            job_set = {s.lower() for s in j.skills}
            return len(user_set & job_set)
        return sorted(jobs, key=relevance_key, reverse=True)

    # Fallback: newest
    return sorted(jobs, key=lambda j: j.posted_at, reverse=True)


def paginate_cursor(
    jobs: list[NormalizedJob],
    cursor: str | None = None,
    limit: int = 20,
) -> tuple[list[NormalizedJob], str | None, bool]:
    """
    Simple cursor-based pagination over an in-memory sorted list.
    Cursor is the job.id of the last seen item.
    Returns (page_items, next_cursor, has_more).
    """
    if cursor:
        ids = [j.id for j in jobs]
        try:
            start = ids.index(cursor) + 1
        except ValueError:
            start = 0
    else:
        start = 0

    page = jobs[start: start + limit]
    has_more = (start + limit) < len(jobs)
    next_cursor = page[-1].id if has_more and page else None
    return page, next_cursor, has_more
