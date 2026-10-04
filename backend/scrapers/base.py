"""
Abstract base class all scraper adapters must implement.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from models.job import NormalizedJob


@dataclass
class SearchFilters:
    """
    Normalized search filters from the frontend.
    Each scraper translates these into its own site-specific params.
    """
    keyword: str | None = None
    category: str | None = None    # e.g. 'software-development'
    country: str | None = None     # e.g. 'USA'
    work_setup: list[str] = field(default_factory=list)   # ['remote', 'hybrid']
    job_type: list[str] = field(default_factory=list)     # ['full-time']
    experience_level: list[str] = field(default_factory=list)  # ['senior', 'mid']
    date_posted: str = "all"       # '24h' | '7d' | '30d' | 'all'
    min_salary: int = 0
    sort_by: str = "relevant"      # 'relevant' | 'newest' | 'salary'
    max_pages: int = 2


@dataclass
class FilterOption:
    id: str
    label: str
    count: int = 0


@dataclass
class FilterMap:
    categories: list[FilterOption] = field(default_factory=list)
    countries: list[FilterOption] = field(default_factory=list)
    job_types: list[FilterOption] = field(default_factory=list)


class BaseScraper(ABC):
    """All scraper adapters must subclass this."""

    site_name: str = "unknown"
    site_url: str = ""

    @abstractmethod
    def get_filters(self) -> FilterMap:
        """
        Discover available filter options from the site.
        Called once during onboarding and periodically to refresh.
        """
        ...

    @abstractmethod
    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]:
        """
        Scrape jobs matching the given filters.
        Returns a flat list of NormalizedJob objects.
        """
        ...
