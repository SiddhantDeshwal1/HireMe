"""
Normalized data models for HireMe.
All scraper adapters must produce NormalizedJob objects.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
import uuid
import re
from datetime import datetime, timezone


# ── Enums (string literals for JSON-friendliness) ─────────────────────────────

WorkSetup = str        # 'remote' | 'hybrid' | 'on-site' | 'unknown'
JobType = str          # 'full-time' | 'contract' | 'internship' | 'part-time'
ExperienceLevel = str  # 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
Platform = str         # 'amazon' | 'linkedin' | 'greenhouse' | 'lever' | ...


@dataclass
class SalaryRange:
    min: float | None = None
    max: float | None = None
    currency: str = "USD"
    interval: str = "yearly"   # 'yearly' | 'monthly' | 'hourly'
    is_estimated: bool = False

    def to_dict(self) -> dict:
        return {
            "min": self.min,
            "max": self.max,
            "currency": self.currency,
            "interval": self.interval,
            "isEstimated": self.is_estimated,
        }


@dataclass
class JobSource:
    platform: Platform
    url: str
    source_job_id: str
    scraped_at: str  # ISO 8601

    def to_dict(self) -> dict:
        return {
            "platform": self.platform,
            "url": self.url,
            "sourceJobId": self.source_job_id,
            "scrapedAt": self.scraped_at,
        }


@dataclass
class NormalizedJob:
    """
    Canonical job representation across all scrapers.
    Maps 1:1 to the frontend JobPosting interface.
    """
    # Required fields
    title: str
    company_name: str
    company_domain: str
    apply_url: str
    sources: list[JobSource] = field(default_factory=list)
    posted_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    description_markdown: str = ""
    description_html: str = ""
    skills: list[str] = field(default_factory=list)
    salary: SalaryRange = field(default_factory=SalaryRange)

    # Location
    city: str | None = None
    state: str | None = None
    country: str = "Unknown"
    is_remote_eligible: bool = False

    # Categorization
    work_setup: WorkSetup = "unknown"
    job_type: JobType = "full-time"
    experience_level: ExperienceLevel = "mid"

    # Internal
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    slug: str = ""
    is_dead: bool = False
    report_count: int = 0
    updated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    raw: dict[str, Any] = field(default_factory=dict)  # raw API response for debugging

    def __post_init__(self):
        if not self.slug:
            self.slug = self._make_slug()

    def _make_slug(self) -> str:
        base = f"{self.title}-{self.company_name}"
        slug = re.sub(r"[^a-z0-9]+", "-", base.lower()).strip("-")
        return f"{slug}-{self.id[:5]}"

    def dedup_key(self) -> str:
        """Fuzzy deduplication key: normalized company + title."""
        def _norm(s: str) -> str:
            return re.sub(r"[^a-z0-9]", "", s.lower())
        return f"{_norm(self.company_name)}:{_norm(self.title)}"

    def to_api_dict(self) -> dict:
        """Serialize to the frontend JobPosting JSON schema."""
        return {
            "id": self.id,
            "slug": self.slug,
            "title": self.title,
            "company": {
                "id": f"comp-{re.sub(r'[^a-z0-9]', '-', self.company_name.lower())}",
                "name": self.company_name,
                "logoUrl": f"https://img.logo.dev/{self.company_domain}?token=pk_test_hireme",
                "websiteUrl": f"https://{self.company_domain}",
                "isVerified": True,
                "domain": self.company_domain,
            },
            "location": {
                "city": self.city,
                "state": self.state,
                "country": self.country,
                "isRemoteEligible": self.is_remote_eligible,
            },
            "workSetup": self.work_setup,
            "jobType": self.job_type,
            "experienceLevel": self.experience_level,
            "salary": self.salary.to_dict(),
            "descriptionMarkdown": self.description_markdown,
            "descriptionHtml": self.description_html,
            "skills": self.skills,
            "sources": [s.to_dict() for s in self.sources],
            "postedAt": self.posted_at,
            "updatedAt": self.updated_at,
            "isDead": self.is_dead,
            "reportCount": self.report_count,
            "applyUrl": self.apply_url,
        }
