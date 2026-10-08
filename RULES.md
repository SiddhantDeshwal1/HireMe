# Project Engineering Rules & Conventions

> **Description:** This file defines the core engineering standards, architectural conventions, and development rules we strictly follow while building and maintaining **HireMe**. All contributors, AI coding assistants, and team members must adhere to these guidelines.

---

## 1. Documentation & The `docs/` Directory Rule

### 1.1 Purpose of `docs/`
The `docs/` directory is the single source of truth for all system architecture documentation, design diagrams, data contract specifications, guides, and visual assets (screenshots).

### 1.2 How `docs/` Works
- **Centralized Documentation**: All architectural specifications, API contracts, flowcharts, diagrams (`.puml`, `.drawio`, Mermaid diagrams), and UI screenshots must reside in `docs/`. Never scatter loose documentation, prompts, or notes in subdirectories like `backend/`, `frontend/`, or `scrapers/`.
- **Historical Archives (`docs/history/`)**: The `docs/history/` subdirectory is dedicated to historical development notes, legacy prompt templates, prior handoff requirements, and deprecated design specs. Moving completed or superseded notes to `docs/history/` prevents clutter while retaining project context.
- **Continuous Synchronization**: Whenever an architectural change is made (e.g., adding a new company scraper, modifying database schemas, altering API contracts, or creating frontend pages), the corresponding documents in `docs/` must be updated immediately in the same change set.
- **Living Diagrams**: All system diagrams (`docs/ARCHITECTURE.md`, `docs/ARCHITECTURE.puml`, `docs/ARCHITECTURE_DIAGRAM.md`) must reflect the actual, running state of the code.

---

## 2. Architecture & Design Principles

- **Simplicity First**: Write the minimum code needed to solve the problem cleanly. Avoid speculative abstractions, unnecessary configurability, and over-engineering for hypothetical futures.
- **Surgical Changes**: Touch only what is directly relevant to the feature or fix. Never refactor working, unrelated code or modify formatting outside your scope.
- **Clean Separation of Concerns**:
  - `frontend/`: Next.js 16 (App Router), React 19, Tailwind CSS, Lucide icons.
  - `backend/`: FastAPI REST API, background worker, SQLite database with WAL mode, in-memory caching.
  - `backend/scrapers/`: Modular adapters implementing `BaseScraper`.
  - `docs/`: System documentation, specifications, and architecture diagrams.

---

## 3. Scraper Pipeline Standards

- **TLS Impersonation Required**: All external scraping requests MUST use `curl_cffi` with `impersonate="chrome120"` to bypass AWS WAF, Cloudflare, and browser fingerprinting defenses. Never use standard `requests` or `urllib` for web scraping.
- **Unified Normalization**: All scraper adapters must map external API/DOM payloads into the `NormalizedJob` dataclass model (`backend/models/job.py`).
- **Resilient Worker Isolation**: A failure, timeout, or rate-limit block on one scraper must NEVER crash the background worker or halt ingestion for other portals. All scraper exceptions must be caught, logged, and isolated.
- **Rate-Limiting & Jitter**: Include randomized delays (1 to 4 seconds) between paginated requests to respect external servers and avoid IP bans.
- **Two-Stage Onboarding**:
  1. New career page links start in `backend/sites/new_links.txt`.
  2. Once the scraper adapter is verified and registered in `backend/scrapers/__init__.py`, the link is moved to `backend/sites/links.txt`.

---

## 4. Backend & Database Rules

- **Database Performance**: SQLite must run in WAL (`journal_mode = WAL`) with `synchronous = NORMAL` and proper indexing (`dedup_key`, `company_name`, `work_setup`, `job_type`, `experience_level`, `posted_at`).
- **Deduplication Engine**: Enforce cross-platform deduplication using normalized fuzzy keys (`lowercase(company) + ":" + lowercase(title)`) across a 48-hour rolling window.
- **TTL Cache Invalidation**: The in-memory query cache (`cache.py`) must be invalidated on data mutations, manual scrape triggers, or dead-job reports.
- **Safe Schema Migrations**: When adding new database tables or columns, use conditional statements (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN`) to prevent breaking existing local SQLite databases.

---

## 5. Frontend & UI/UX Rules

- **Strict Type Safety**: All API responses, forms, and entities must be typed with strict TypeScript interfaces in `frontend/src/types/`. Never use `any` unless strictly necessary for dynamic payloads.
- **Responsive & Accessible Design**: Interfaces must support dark/light themes cleanly, use accessible semantic HTML, and scale gracefully across mobile, tablet, and desktop viewports.
- **Optimistic State & Client-Side Resilience**: When API calls take time (e.g. live scrape triggers, resume parsing), provide clear feedback with loading spinners, toasts, and skeleton cards.
- **No Hardcoded URLs**: Use `NEXT_PUBLIC_BACKEND_URL` environment variable for all API calls with fallback to `http://localhost:8000`.

---

## 6. Git & Version Control Rules

- **Clean Working Tree**: Never commit temporary files, virtual environments (`.venv`), lockfile conflicts, build artifacts (`.next`, `dist`), or SQLite WAL/SHM temporary files.
- **Conventional Commits**: Commit messages must follow conventional commits:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation and diagram updates
  - `refactor:` for code restructuring
  - `chore:` for dependency or configuration updates
