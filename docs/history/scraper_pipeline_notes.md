# HireMe Scraper Pipeline — Developer Notes

## Upcoming Features
- [ ] LinkedIn scraper (requires OAuth or cookie-based auth)
- [ ] Greenhouse.io generic board scraper (many companies use it)
- [ ] Lever.co generic board scraper
- [ ] Indeed scraper
- [ ] Workday ATS scraper (very complex, site-specific)
- [ ] Glassdoor scraper

## Important Implementation Notes

### new_links.txt Onboarding Flow
1. Add a raw career page URL to `new_links.txt`
2. The onboarding LLM prompt (`scraper_onboarding_prompt.md`) is used to manually/automatically configure a scraper adapter for that site
3. Once the adapter is written and tested, move the URL to `links.txt`
4. The worker will automatically start scraping it on the next 5-minute cycle

### TLS Fingerprinting
- ALWAYS use `curl_cffi` with `impersonate="chrome120"` — never `requests` or `urllib`
- Amazon Jobs requires: a warm-up GET to the search page, CSRF token extraction, then the `.json` endpoint
- WAF detection is session-level: the warm-up GET must come before the API call in the SAME session

### Filter Mapping (Amazon)
- Category filter param: `job_category[]`  (e.g. `software-development`)
- Country filter param: `country[]`  (e.g. `USA`, `GBR`, `IND`)
- Sort: `sort=relevant` or `sort=recent`
- Category IDs live in `categories_cms` inside the React props in the HTML

### Job Normalization
- All scrapers must return `NormalizedJob` (see `models/job.py`)
- Work setup inference: look for 'remote', 'hybrid', 'on-site' in title/description/location
- Experience level inference: 'junior'→entry, 'associate'→entry, 'mid'/'II'→mid, 'senior'→senior, 'staff'/'lead'→lead
- Salary: Amazon rarely posts salary — always set `isEstimated: false`, min/max: null unless found

### Deduplication
- Key = `normalize(company_name) + ":" + normalize(title)`
- Time window: 48 hours
- Merge sources into sources[] array

### Rate Limits
- Random delay 1–4 seconds between paginated requests (per scraper)
- Add jitter between different site scrapers too

## TODOs
- [ ] Persist jobs to SQLite or PostgreSQL (currently in-memory dict)
- [ ] Add match score computation in backend using user preferences vector
- [ ] Implement cursor-based pagination properly
- [ ] Add Redis for caching scraped results
- [ ] Add background task queue (Celery or ARQ) for production
- [ ] Implement dead-link verification worker
- [ ] Add telemetry/metrics endpoint
