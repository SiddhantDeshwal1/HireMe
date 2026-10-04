# Backend Requirements & API Specification for HireMe
**Product:** Personalized Job Aggregator (Frontend Handoff Document)  
**Version:** 1.0.0  
**Status:** Approved for Implementation  
**Frontend Architecture:** Next.js (App Router), TypeScript Strict, Tailwind CSS, Framer Motion

---

## 1. Executive Summary & Architecture Goals

HireMe solves job-search fatigue by enforcing **aggressive personalization** at the ingestion and presentation layers. Rather than bombarding users with 10,000 raw postings, the frontend captures granular onboarding criteria (roles, seniority, salary floor, tech stack, remote preferences) and requires the backend to:

1. Ingest, normalize, and score scraped job postings against user preference vectors.
2. Deduplicate cross-platform scrapings (e.g. identical roles posted to LinkedIn, Indeed, and Greenhouse within 48 hours).
3. Deliver sub-100ms response times for filtered queries through cursor-based pagination and database indexing.
4. Support telemetry for dead/expired listings reported by end users.

---

## 2. Core Data Contracts (TypeScript Interfaces & JSON Schemas)

### 2.1 Job Model (`JobPosting`)

```typescript
export type WorkSetup = 'remote' | 'hybrid' | 'on-site';
export type JobType = 'full-time' | 'contract' | 'internship' | 'part-time';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string; // ISO 4217, default "USD"
  interval: 'yearly' | 'monthly' | 'hourly';
  isEstimated: boolean; // true if extracted or imputed via ML model
}

export interface JobSource {
  platform: 'linkedin' | 'indeed' | 'greenhouse' | 'lever' | 'workday' | 'company_site' | 'other';
  url: string;
  sourceJobId: string;
  scrapedAt: string; // ISO 8601
}

export interface JobPosting {
  id: string; // Unique UUIDv4
  slug: string; // URL-safe slug: e.g. "senior-frontend-engineer-stripe-a1b2c"
  title: string;
  company: {
    id: string;
    name: string;
    logoUrl: string | null;
    websiteUrl: string | null;
    isVerified: boolean;
    domain: string;
  };
  location: {
    city: string | null;
    state: string | null;
    country: string;
    timezoneRestrictions?: string[]; // e.g. ["UTC-5", "UTC-8"]
    isRemoteEligible: boolean;
  };
  workSetup: WorkSetup;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  salary: SalaryRange;
  descriptionHtml: string;
  descriptionMarkdown: string;
  skills: string[]; // Normalized tags, e.g. ["React", "TypeScript", "Next.js", "Tailwind"]
  sources: JobSource[]; // Aggregated sources indicating deduplicated origins
  matchScore?: number; // 0-100 calculated match score based on user profile
  matchReasons?: string[]; // e.g. ["Matches 'Next.js' skill", "Exceeds $140k min salary", "100% Remote"]
  postedAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  isDead: boolean; // Flagged as dead/expired
  reportCount: number;
  applyUrl: string; // Canonical application link
}
```

### 2.2 User Profile & Preference Vector (`UserProfile`)

```typescript
export interface UserPreferences {
  targetRoles: string[]; // e.g. ["Frontend Engineer", "Full Stack Developer"]
  experienceLevels: ExperienceLevel[];
  workSetups: WorkSetup[];
  jobTypes: JobType[];
  preferredLocations: string[]; // e.g. ["San Francisco, CA", "New York, NY", "Worldwide"]
  minSalary: number; // Annual in USD, default: 0
  primaryTechStack: string[]; // e.g. ["TypeScript", "React", "Node.js"]
  excludedCompanies: string[]; // Negative filter
  remoteOnly: boolean;
  maxPostingAgeDays: number; // e.g. 7, 14, 30
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
  savedJobIds: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 2.3 Dead Link Report Model (`DeadLinkReport`)

```typescript
export interface DeadLinkReport {
  id: string;
  jobId: string;
  reportedByUserId?: string;
  reason?: '404_not_found' | 'expired_listing' | 'wrong_company' | 'spam' | 'other';
  notes?: string;
  reportedAt: string;
}
```

---

## 3. Required RESTful API Endpoints

### 3.1 Job Endpoints

#### `GET /api/v1/jobs`
Retrieve paginated, filtered, and personalized jobs.

*   **Authentication:** Optional / Bearer Token. If present, server automatically calculates `matchScore` and `matchReasons` tailored to user profile.
*   **Query Parameters:**

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | No | Full-text query for title, company, skills | `react lead engineer` |
| `date_posted` | `string` | No | Time filter: `24h`, `7d`, `30d`, `all` | `7d` |
| `work_setup` | `string` | No | Comma-separated: `remote,hybrid,on-site` | `remote,hybrid` |
| `job_type` | `string` | No | Comma-separated: `full-time,contract` | `full-time` |
| `experience_level`| `string` | No | Comma-separated: `entry,mid,senior,lead`| `senior,lead` |
| `min_salary` | `number` | No | Minimum annual compensation (USD) | `120000` |
| `skills` | `string` | No | Comma-separated normalized tech skills | `TypeScript,React,GraphQL` |
| `sort_by` | `string` | No | `newest`, `highest_salary`, `match_score`| `match_score` |
| `cursor` | `string` | No | Base64-encoded cursor for next page | `eyJpZCI6IjEyMyIsInNjb3JlIjoxfQ==` |
| `limit` | `number` | No | Page size (default: 20, max: 50) | `20` |

*   **Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "job_01h9z3...",
      "slug": "senior-frontend-engineer-stripe",
      "title": "Senior Frontend Engineer",
      "company": {
        "id": "comp_stripe",
        "name": "Stripe",
        "logoUrl": "https://img.logo.dev/stripe.com",
        "websiteUrl": "https://stripe.com",
        "isVerified": true,
        "domain": "stripe.com"
      },
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "USA",
        "isRemoteEligible": true
      },
      "workSetup": "remote",
      "jobType": "full-time",
      "experienceLevel": "senior",
      "salary": {
        "min": 175000,
        "max": 225000,
        "currency": "USD",
        "interval": "yearly",
        "isEstimated": false
      },
      "descriptionMarkdown": "...",
      "skills": ["TypeScript", "React", "Next.js", "GraphQL"],
      "sources": [
        {
          "platform": "linkedin",
          "url": "https://linkedin.com/jobs/view/...",
          "sourceJobId": "li_987",
          "scrapedAt": "2026-10-04T12:00:00Z"
        },
        {
          "platform": "greenhouse",
          "url": "https://boards.greenhouse.io/stripe/jobs/...",
          "sourceJobId": "gh_123",
          "scrapedAt": "2026-10-04T12:05:00Z"
        }
      ],
      "matchScore": 96,
      "matchReasons": [
        "Matches 4/4 preferred skills",
        "Remote role fits your work style",
        "Base salary ($175k-$225k) exceeds your $150k target"
      ],
      "postedAt": "2026-10-04T08:30:00Z",
      "updatedAt": "2026-10-04T12:05:00Z",
      "isDead": false,
      "reportCount": 0,
      "applyUrl": "https://boards.greenhouse.io/stripe/jobs/..."
    }
  ],
  "pagination": {
    "nextCursor": "eyJpZCI6ImpvYl8wMWg5ejMiLCJzb3J0IjoxNzV9",
    "hasMore": true,
    "totalMatching": 142
  }
}
```

---

#### `GET /api/v1/jobs/:id`
Get single job record with full markdown/HTML description.

*   **Success Response (200 OK):** Single `JobPosting` object.
*   **Error Responses:** `404 Not Found` if deleted or non-existent.

---

#### `POST /api/v1/jobs/:id/report-dead`
Report broken, expired, or non-functional job URL.

*   **Request Body:**
```json
{
  "reason": "expired_listing",
  "notes": "Greenhouse portal says application is closed"
}
```
*   **Response (200 OK):**
```json
{
  "success": true,
  "message": "Report logged. Thank you for keeping HireMe accurate.",
  "reportCount": 1
}
```

---

### 3.2 User Preferences & Onboarding Endpoints

#### `GET /api/v1/user/profile`
Retrieve active user's profile and stored preferences.
*   **Authentication:** Required.
*   **Response (200 OK):** `UserProfile` object.

#### `PUT /api/v1/user/preferences`
Save or update user preference vectors from onboarding or settings.
*   **Authentication:** Required.
*   **Request Body:** `UserPreferences` object.
*   **Response (200 OK):** Updated `UserProfile`.

---

### 3.3 Bookmarks / Saved Jobs Endpoints

#### `GET /api/v1/user/saved-jobs`
Retrieve full `JobPosting[]` array for all bookmarked listings.
*   **Authentication:** Required.
*   **Response (200 OK):**
```json
{
  "data": [ /* JobPosting[] */ ],
  "count": 5
}
```

#### `POST /api/v1/user/saved-jobs/:id`
Bookmark a job.
*   **Response (201 Created):** `{ "success": true, "savedJobIds": ["..."] }`

#### `DELETE /api/v1/user/saved-jobs/:id`
Remove a bookmark.
*   **Response (200 OK):** `{ "success": true, "savedJobIds": ["..."] }`

---

## 4. Deduplication & Data Ingestion Specification

### 4.1 Deduplication Rules
Frontend expects deduplicated entities. Backend ingestion worker must implement:
1.  **Fuzzy Match Key:** Normalize `lowercase(trim(company.name))` + `lowercase(trim(normalize_title(job.title)))`.
2.  **Time Window:** Merges items matching the key posted within 48 hours of each other.
3.  **Source Consolidation:** Push each scrap source into the `sources: JobSource[]` array and point `applyUrl` to the direct ATS (e.g. Greenhouse/Lever) over aggregators (e.g. Indeed).
4.  **Fallback Merging:** Preserve the highest quality compensation and description metadata between postings.

### 4.2 Missing Data Fallback Policies
1.  If salary is missing, server must supply `salary.min: null`, `salary.max: null`, `salary.isEstimated: false`. Frontend renders the graceful `Salary Undisclosed` pill.
2.  If city/state are null but `isRemoteEligible: true`, server returns `location.country: "Worldwide"` or `"US - Remote"`.

---

## 5. Pagination Strategy: Cursor-Based Pagination

*   **Standard:** Use opaque cursor-based pagination (e.g. based on `(sort_value, id)` tuple).
*   **Why cursor over offset:**
    *   Scraped jobs update continuously; offset pagination produces duplicate items and skips items during continuous feed scrolling.
    *   Instantaneous database index seeks (`WHERE (posted_at, id) < (cursor_posted_at, cursor_id)`).
*   **Frontend Contract:**
    *   Client passes `cursor` query parameter on subsequent page requests.
    *   `hasMore: false` halts the infinite loader/scroll event listener.

---

## 6. Real-Time Telemetry & Health Checks

*   `GET /api/health` -> `{ "status": "healthy", "scrapersActive": 8, "totalJobsIndexed": 42910 }`
*   Latency budget: < 80ms p95 for `GET /api/v1/jobs` queries with active user vector filter.
