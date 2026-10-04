# HireMe — System Architecture

> **Version:** 1.0.0 · **Status:** Active Development · **Last Updated:** 2026-10-05

---

## Overview

HireMe is a personalized job aggregator. It scrapes job listings from multiple company career sites and APIs, normalizes them into a unified data model, deduplicates cross-platform postings, and serves them to a Next.js dashboard through a FastAPI backend.

```
                ┌─────────────────────────────────────┐
                │         Next.js Frontend              │
                │  (Dashboard · Onboarding · Saved)    │
                └──────────────┬──────────────────────┘
                               │  HTTP (localhost:8000)
                ┌──────────────▼──────────────────────┐
                │          FastAPI Backend              │
                │       /api/v1/jobs  (main)           │
                │       /api/health   (telemetry)      │
                └──────┬────────────────────┬──────────┘
                       │                    │
         ┌─────────────▼──────┐  ┌──────────▼────────────┐
         │   In-Memory Store   │  │  Background Worker     │
         │  (JobStore dict)   │  │  (periodic_worker)     │
         └─────────────────────┘  └──────────┬─────────────┘
                                             │ every 5 min
                              ┌──────────────▼──────────────┐
                              │       Scraper Registry       │
                              │  (scrapers/__init__.py)      │
                              └──┬──────────────────────┬────┘
                                 │                      │
                    ┌────────────▼──────┐    ┌──────────▼──────────┐
                    │  Amazon Scraper   │    │   Future Scrapers    │
                    │ (curl_cffi TLS)   │    │  (LinkedIn, GH, etc) │
                    └───────────────────┘    └─────────────────────┘
```

---

## Directory Structure

```
/run/media/banana/Alpha/project/HireMe/
├── frontend/                       # Next.js 16 App Router
│   └── src/
│       ├── app/
│       │   ├── dashboard/page.tsx  # Main job feed + filters
│       │   ├── onboarding/page.tsx # User preference setup
│       │   └── saved/page.tsx      # Bookmarked jobs
│       ├── components/dashboard/   # JobCard, FilterSidebar, etc.
│       ├── context/                # PreferencesContext (localStorage)
│       ├── lib/
│       │   ├── api.ts              # HTTP client → FastAPI backend
│       │   ├── matchScore.ts       # Client-side match scoring
│       │   └── deduplication.ts    # Client-side dedup (fallback)
│       └── types/job.ts            # TypeScript interfaces
│
├── backend/                        # FastAPI + Python
│   ├── main.py                     # FastAPI app + all endpoints
│   ├── worker.py                   # Background periodic scraper
│   ├── filters.py                  # Filter + sort + pagination logic
│   ├── requirements.txt
│   ├── models/
│   │   └── job.py                  # NormalizedJob dataclass
│   ├── scrapers/
│   │   ├── __init__.py             # ScraperRegistry
│   │   ├── base.py                 # BaseScraper ABC + SearchFilters
│   │   └── amazon_scraper.py       # Amazon Jobs adapter
│   └── sites/
│       ├── links.txt               # Active tracked sites
│       ├── new_links.txt           # Newly added, awaiting onboarding
│       ├── NOTE.md                 # Developer notes + TODOs
│       └── (scraper configs here)
│
├── docs/
│   ├── ARCHITECTURE.md             # System architecture documentation
│   ├── ARCHITECTURE.puml           # PlantUML diagram
│   ├── backend_requirements.md     # Frontend-authored API contract spec
│   └── screenshots/                # Application UI screenshots
├── README.md                       # Repository overview and setup guide
└── start.sh                        # Unified dev starter script
```

---

## Core Data Flow

### 1. Link Management Flow

```
new_links.txt                         links.txt
─────────────                         ─────────
User adds URL  ──► LLM Onboarding  ──► URL moved here
                   (scraper_onboarding_prompt.md)
                   ↓
                   Scraper adapter written
                   (scrapers/<site>_scraper.py)
                   ↓
                   Registered in REGISTRY dict
                   (scrapers/__init__.py)
                   ↓
                   Worker auto-picks it up next cycle
```

### 2. Periodic Scrape Flow (every 5 minutes)

```
periodic_worker()
  ↓
read_links()           → reads links.txt
  ↓
for each URL:
  get_scraper_for_url()  → looks up REGISTRY by hostname
    ↓
  scraper.scrape_jobs(SearchFilters(max_pages=2))
    ↓ (runs in thread pool, non-blocking)
  list[NormalizedJob]
    ↓
  job_store.upsert()     → deduplication (48h window, fuzzy key)
    ↓
  new_count returned
```

### 3. On-Demand Search Flow (user hits Search)

```
Frontend: fetchJobs(filters, live_scrape=true)
  ↓
GET /api/v1/jobs?q=...&live_scrape=true&...
  ↓
scrape_all(SearchFilters from query params)   ← immediate live scrape
  ↓
job_store.get_all()
  ↓
apply_filters(jobs, filters)
  ↓
sort_jobs(filtered, sort_by)
  ↓
paginate_cursor(sorted, cursor, limit)
  ↓
JSON response → Frontend renders JobCards
```

### 4. Deduplication Strategy

| Step | Detail |
|------|--------|
| **Key** | `normalize(company_name) + ":" + normalize(title)` |
| **Time window** | 48 hours |
| **On duplicate** | Merge `sources[]` arrays (keeps all origin URLs) |
| **Canonical URL** | Direct ATS link preferred over aggregator |
| **Result** | `duplicatesMergedCount` shown in dashboard UI |

---

## Scraper Architecture

### BaseScraper Interface

Every scraper adapter must implement:

```python
class BaseScraper(ABC):
    site_name: str
    site_url:  str

    def get_filters(self) -> FilterMap: ...
    def scrape_jobs(self, filters: SearchFilters) -> list[NormalizedJob]: ...
```

### Filter Translation (per scraper)

| HireMe Filter | Amazon Param | Future: LinkedIn | Future: GH |
|---------------|-------------|-----------------|------------|
| `keyword` | `normalized_keywords` | `keywords` | `q` |
| `category` | `job_category[]` | N/A | N/A |
| `country` | `country[]` | `geoId` | N/A |
| `work_setup` | inferred | `f_WT` | N/A |
| `date_posted` | `sort=recent` | `f_TPR` | N/A |

### Amazon Scraper — Auth Bypass Detail

Amazon Jobs uses AWS WAF to block non-browser TLS fingerprints and requires a Rails CSRF token:

```
1. GET https://www.amazon.jobs/en-gb/search
   → Session cookies set (amazon_jobs_session, __Host-mons-sid)
   → Extract <meta name="csrf-token" content="..."> from HTML
   → Extract categories_cms from React props JSON

2. GET https://www.amazon.jobs/en-gb/search.json
   Headers: X-CSRF-Token, X-Requested-With: XMLHttpRequest
   Params:  job_category[], country[], result_limit=10, offset=N
   → Returns JSON: { jobs: [...], hits: N, facets: {...} }
```

**Key insight:** The correct endpoint is `/en-gb/search.json` — NOT `/api/v1/job_searches` (which always returns 401).

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Scraper telemetry + job count |
| `GET` | `/api/v1/jobs` | Paginated filtered job feed |
| `GET` | `/api/v1/jobs/:id` | Single job detail |
| `POST` | `/api/v1/jobs/:id/report-dead` | Flag broken listing |
| `GET` | `/api/v1/user/profile` | User preferences |
| `PUT` | `/api/v1/user/preferences` | Update preferences |
| `GET` | `/api/v1/user/saved-jobs` | Bookmarked jobs |
| `POST` | `/api/v1/user/saved-jobs/:id` | Bookmark a job |
| `DELETE` | `/api/v1/user/saved-jobs/:id` | Remove bookmark |

### Key Query Params for `GET /api/v1/jobs`

| Param | Type | Description |
|-------|------|-------------|
| `q` | string | Full-text keyword |
| `live_scrape` | bool | Trigger immediate scrape before returning |
| `category` | string | Job category identifier (e.g. `software-development`) |
| `country` | string | 3-letter country code (e.g. `USA`) |
| `work_setup` | string | Comma-sep: `remote,hybrid,on-site` |
| `job_type` | string | Comma-sep: `full-time,contract,internship` |
| `experience_level` | string | Comma-sep: `entry,mid,senior,lead` |
| `date_posted` | string | `24h` / `7d` / `30d` / `all` |
| `min_salary` | int | Minimum annual salary USD |
| `sort_by` | string | `relevant` / `newest` / `salary` |
| `cursor` | string | Pagination cursor (job ID of last seen) |
| `limit` | int | Page size (default 20, max 50) |

---

## Frontend Integration

The frontend `lib/api.ts` calls the FastAPI backend with the `live_scrape=true` flag when filters change, triggering an immediate targeted scrape. On load with no filters, it uses `live_scrape=false` and returns cached results from the last periodic scrape.

```typescript
// Immediate search: live_scrape=true triggers backend scrape
const url = buildApiUrl(filters, { live_scrape: hasActiveFilters });
const response = await fetch(url);
```

The `matchScore` and `matchReasons` are computed client-side using `lib/matchScore.ts` since user preferences are stored in `localStorage` (no auth system yet).

---

## Onboarding a New Career Site

1. Add the career page URL to `backend/sites/new_links.txt`
2. Use `backend/scraper_onboarding_prompt.md` as the LLM system prompt
3. LLM analyses the site's network requests, discovers the JSON API
4. LLM writes `backend/scrapers/<site>_scraper.py` implementing `BaseScraper`
5. Register in `backend/scrapers/__init__.py` REGISTRY dict
6. Test: `python -c "from scrapers.<site>_scraper import ...; ..."`
7. Move URL from `new_links.txt` → `links.txt`
8. Worker picks it up automatically on the next 5-minute cycle

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend (separate terminal)
cd frontend
pnpm dev
```

Backend: http://localhost:8000  
Frontend: http://localhost:3000  
API Docs: http://localhost:8000/docs  
