# HireMe — System Architecture

> **Version:** 2.0.0 · **Status:** Active Development · **Last Updated:** 2026-10-08  
> **Clean Diagram Reference:** See [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) for full Mermaid sequence & entity diagrams.

---

## Overview

HireMe is a personalized, high-performance job aggregator that crawls career portals directly at the source (Amazon, Google, Microsoft, Meta, Netflix, Uber, Rubrik). It normalizes listings into a unified data model, deduplicates cross-platform postings across a 48-hour window, stores them in SQLite (WAL mode) with multi-tier in-memory TTL caching, and delivers curated roles to a Next.js 16 frontend with ATS resume analysis and application history tracking.

```
                ┌─────────────────────────────────────────────────────────┐
                │                    Next.js Frontend                     │
                │    (Dashboard · History · Admin · Profile · Saved)      │
                └────────────────────────────┬────────────────────────────┘
                                             │ HTTP REST (localhost:8000)
                ┌────────────────────────────▼────────────────────────────┐
                │                     FastAPI Backend                     │
                │        /api/v1/jobs               /api/health           │
                │        /api/v1/user/applications /api/v1/resume/upload │
                │        /api/v1/admin/scraper/*    /api/v1/user/profile  │
                └───────┬────────────────────┬────────────────────┬───────┘
                        │                    │                    │
          ┌─────────────▼──────┐  ┌──────────▼────────────┐  ┌────▼─────────────────┐
          │   In-Memory Cache  │  │  SQLite Database (WAL)│  │ PyPDF Resume Parser  │
          │  (cache.py TTL)    │  │ (jobs, apps, profile) │  │  (resume_analyzer)   │
          └────────────────────┘  └──────────▲────────────┘  └──────────────────────┘
                                             │ upsert / dedup
                                  ┌──────────┴────────────┐
                                  │   Background Worker   │
                                  │  (periodic_worker)    │
                                  └──────────┬────────────┘
                                             │ every 5 min
                              ┌──────────────▼──────────────┐
                              │       Scraper Registry      │
                              │    (scrapers/__init__.py)   │
                              └──┬──────┬──────┬──────┬─────┘
                                 │      │      │      │
            ┌────────────────────▼┐ ┌───▼──────▼─┐ ┌──▼───────────────────┐
            │ Amazon Jobs Scraper │ │ Google/Meta│ │ Netflix, Uber, Rubrik│
            │  (curl_cffi chrome) │ │  Microsoft │ │ (curl_cffi chrome)   │
            └─────────────────────┘ └────────────┘ └───────────────────────┘
```

---

## Directory Structure

```
/run/media/banana/Alpha/project/HireMe/
├── RULES.md                        # Project engineering rules and doc standards
├── PROGRESS.md                     # Roadmap, phase tracking & milestones
├── README.md                       # Repository overview and setup guide
├── start.sh                        # Unified dev starter script
│
├── frontend/                       # Next.js 16 App Router (React 19)
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Landing page
│       │   ├── dashboard/page.tsx  # Main job feed, company filter & search
│       │   ├── admin/page.tsx      # Scraper telemetry & crawler control
│       │   ├── history/page.tsx    # Application tracking & status history
│       │   ├── profile/page.tsx    # Profile details, links, resume upload
│       │   ├── onboarding/page.tsx # Candidate preference survey
│       │   ├── saved/page.tsx      # Bookmarked jobs
│       │   └── jobs/[id]/page.tsx  # Dedicated job view
│       ├── components/             # Reusable UI & dashboard components
│       ├── context/                # PreferencesContext & Auth
│       ├── lib/                    # api.ts, matchScore.ts, companyLogo.ts
│       └── types/job.ts            # TypeScript strict data contracts
│
├── backend/                        # FastAPI REST API & Ingestion Engine
│   ├── main.py                     # API router & endpoint definitions
│   ├── database.py                 # SQLite schema, indexing & dedup
│   ├── worker.py                   # Background scraper daemon & telemetry
│   ├── filters.py                  # Cursor-based pagination & query filtering
│   ├── cache.py                    # In-memory query cache with TTL
│   ├── resume_analyzer.py          # PyPDF extraction & skill analysis
│   ├── requirements.txt            # Python dependencies
│   ├── models/job.py               # NormalizedJob dataclass
│   ├── scrapers/                   # Modular company scrapers (BaseScraper)
│   │   ├── base.py                 # Abstract base class & search filters
│   │   ├── amazon_scraper.py       # Amazon Jobs adapter (WAF/CSRF)
│   │   ├── google_scraper.py       # Google Careers adapter
│   │   ├── microsoft_scraper.py    # Microsoft Careers adapter
│   │   ├── meta_scraper.py         # Meta Careers adapter
│   │   ├── netflix_scraper.py      # Netflix Careers adapter
│   │   ├── uber_scraper.py         # Uber Careers adapter
│   │   └── rubrik_scraper.py       # Rubrik Careers adapter
│   ├── media/logos/                # Brand logo assets served via /logos
│   └── sites/
│       ├── links.txt               # Active tracked career URLs
│       └── new_links.txt           # Pending URL queue
│
└── docs/                           # Documentation, diagrams & visual assets
    ├── ARCHITECTURE.md             # In-depth architectural specification
    ├── ARCHITECTURE_DIAGRAM.md     # Clean Mermaid system architecture diagrams
    ├── ARCHITECTURE.puml           # PlantUML system architecture diagram
    ├── screenshots/                # Application UI screenshots
    └── history/                    # Historical notes & previous iteration files
        ├── README.md               # Overview of archived assets
        ├── backend_requirements_v1.md # Initial v1 frontend handoff spec
        ├── scraper_onboarding_prompt.md # Reverse-engineering LLM prompt
        └── scraper_pipeline_notes.md # Early scraper notes & TODOs
```

---

## Core Data Flow

### 1. Link Management Flow

```
new_links.txt                         links.txt
─────────────                         ─────────
User adds URL  ──► Reverse Engineer ──► URL moved here
                   (docs/history/)
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
    ↓ (runs in thread pool, non-blocking curl_cffi)
  list[NormalizedJob]
    ↓
  upsert_jobs()          → deduplication (48h window, fuzzy key)
    ↓
  cache.invalidate_all()
```

### 3. Application Tracking Flow

```
User applies on external ATS portal
  ↓
Frontend prompts "Did you apply?" (AppliedConfirmModal)
  ↓
POST /api/v1/user/applications
  ↓
Recorded in job_applications SQLite table (status: 'applied')
  ↓
Available at /history with filterable statuses (applied, interviewing, rejected, offered)
```

### 4. Deduplication Strategy

| Step | Detail |
|------|--------|
| **Key** | `normalize(company_name) + ":" + normalize(title)` |
| **Time window** | 48 hours |
| **On duplicate** | Merge `sources[]` arrays (keeps all origin URLs) |
| **Canonical URL** | Direct ATS link preferred over aggregator |
| **TTL** | 5 days rolling expiry |

---

## Running Locally

```bash
# Recommended one-command startup:
./start.sh

# Or manual:
# Backend:
cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Frontend:
cd frontend && pnpm dev
```
