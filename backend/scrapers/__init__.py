"""
Scraper registry — maps site hostnames to their adapter classes.
"""
from scrapers.base import BaseScraper
from scrapers.amazon_scraper import AmazonJobsScraper
from scrapers.microsoft_scraper import MicrosoftJobsScraper
from scrapers.netflix_scraper import NetflixJobsScraper
from scrapers.rubrik_scraper import RubrikJobsScraper
from scrapers.google_scraper import GoogleJobsScraper
from scrapers.meta_scraper import MetaJobsScraper
from scrapers.uber_scraper import UberJobsScraper

REGISTRY: dict[str, type[BaseScraper]] = {
    # Amazon
    "www.amazon.jobs": AmazonJobsScraper,
    "amazon.jobs": AmazonJobsScraper,
    # Microsoft
    "apply.careers.microsoft.com": MicrosoftJobsScraper,
    "careers.microsoft.com": MicrosoftJobsScraper,
    # Netflix
    "explore.jobs.netflix.net": NetflixJobsScraper,
    "jobs.netflix.com": NetflixJobsScraper,
    # Rubrik
    "www.rubrik.com": RubrikJobsScraper,
    "rubrik.com": RubrikJobsScraper,
    # Google
    "www.google.com": GoogleJobsScraper,
    "careers.google.com": GoogleJobsScraper,
    # Meta
    "www.metacareers.com": MetaJobsScraper,
    "metacareers.com": MetaJobsScraper,
    # Uber
    "jobs.uber.com": UberJobsScraper,
    "www.uber.com": UberJobsScraper,
}


def get_scraper_for_url(url: str) -> BaseScraper | None:
    """Return an initialized scraper instance for the given URL, or None."""
    from urllib.parse import urlparse
    cleaned_url = url.strip().strip('"').strip("'").strip(",")
    host = urlparse(cleaned_url).netloc.lower()
    cls = REGISTRY.get(host)
    if cls is None:
        return None
    return cls()


__all__ = [
    "BaseScraper",
    "AmazonJobsScraper",
    "MicrosoftJobsScraper",
    "NetflixJobsScraper",
    "RubrikJobsScraper",
    "GoogleJobsScraper",
    "MetaJobsScraper",
    "UberJobsScraper",
    "REGISTRY",
    "get_scraper_for_url",
]
