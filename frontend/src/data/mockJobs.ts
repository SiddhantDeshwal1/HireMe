import { JobPosting } from '@/types/job';

export const RAW_MOCK_JOBS: JobPosting[] = [
  {
    id: 'job-str-01',
    slug: 'senior-frontend-engineer-stripe',
    title: 'Senior Frontend Engineer',
    company: {
      id: 'comp-stripe',
      name: 'Stripe',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://stripe.com',
      isVerified: true,
      domain: 'stripe.com',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 185000,
      max: 235000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'React', 'Next.js', 'Web Performance', 'GraphQL'],
    sources: [
      {
        platform: 'greenhouse',
        url: 'https://boards.greenhouse.io/stripe/jobs/482910',
        sourceJobId: 'gh-str-482910',
        scrapedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://stripe.com/jobs/frontend-senior',
    benefits: ['Full Health & Dental', '$10k/yr Learning Stipend', '401(k) 5% Match', 'Home Office Budget'],
    descriptionMarkdown: `### The Role
Stripe builds economic infrastructure for the internet. As a Senior Frontend Engineer on our Core Dashboard team, you will craft the interactive interfaces that millions of business owners and developers rely on every single day to run global operations.

### Key Responsibilities
- Architect high-performance, accessible, and resilient web applications using TypeScript and modern React.
- Collaborate with designers, product managers, and systems engineers to deliver delightful financial workflows.
- Champion code quality, design tokens, micro-frontends, and continuous integration standards across the frontend guild.
- Optimize sub-second latency for complex ledger tables and real-time visualization widgets.

### Qualifications
- 5+ years of software engineering experience focusing on production web applications.
- Deep expertise in TypeScript, React, and browser rendering internals.
- Demonstrated empathy for developer experience and user-first product craftsmanship.`,
  },
  {
    // DUPLICATE OF STRIPE SENIOR FRONTEND POSTED ON LINKEDIN WITHIN 12 HOURS
    id: 'job-str-01-dup',
    slug: 'senior-frontend-engineer-stripe-li',
    title: 'Senior Frontend Engineer',
    company: {
      id: 'comp-stripe',
      name: 'Stripe',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://stripe.com',
      isVerified: true,
      domain: 'stripe.com',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 185000,
      max: 235000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['React', 'TypeScript', 'Tailwind CSS'],
    sources: [
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/jobs/view/stripe-senior-frontend-3901',
        sourceJobId: 'li-9921',
        scrapedAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://linkedin.com/jobs/view/stripe-senior-frontend-3901',
    descriptionMarkdown: 'Identical role reposted on LinkedIn scraper.',
  },
  {
    id: 'job-lin-02',
    slug: 'staff-product-engineer-linear',
    title: 'Staff Product Engineer',
    company: {
      id: 'comp-linear',
      name: 'Linear',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://linear.app',
      isVerified: true,
      domain: 'linear.app',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'lead',
    salary: {
      min: 220000,
      max: 265000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'React', 'Electron', 'WebSockets', 'GraphQL', 'Tailwind CSS'],
    sources: [
      {
        platform: 'company_site',
        url: 'https://linear.app/careers/staff-product-engineer',
        sourceJobId: 'lin-staff-01',
        scrapedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://linear.app/careers',
    benefits: ['Competitive Equity', 'Unlimited PTO', '$5k Workspace Setup', 'Annual Team Retreats'],
    descriptionMarkdown: `### About Linear
Linear is the issue tracking tool created for high-performance software teams. We value speed, keyboard-first interactions, and extreme attention to typography, transitions, and local-first architecture.

### What you'll do
- Build synchronous collaborative software with 60fps animations and offline sync.
- Create new primitives for product planning, roadmaps, and automated developer triage.
- Direct influence on product vision, UI motion curves, and client-side SQLite/IndexedDB caching.`,
  },
  {
    id: 'job-supa-03',
    slug: 'full-stack-engineer-supabase',
    title: 'Full Stack Engineer (Developer Experience)',
    company: {
      id: 'comp-supabase',
      name: 'Supabase',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://supabase.com',
      isVerified: true,
      domain: 'supabase.com',
    },
    location: {
      city: 'Worldwide',
      state: null,
      country: 'Global',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'mid',
    salary: {
      min: 140000,
      max: 175000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'Next.js', 'PostgreSQL', 'Node.js', 'Tailwind CSS', 'Docker'],
    sources: [
      {
        platform: 'greenhouse',
        url: 'https://boards.greenhouse.io/supabase/jobs/dx-01',
        sourceJobId: 'gh-sup-8812',
        scrapedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://supabase.com/careers',
    benefits: ['100% Async Culture', 'Parental Leave', 'Hardware of your choice', 'Open Source Sponsorship'],
    descriptionMarkdown: `### The Opportunity
Supabase is the open-source Firebase alternative. We are seeking a product-minded Full Stack Engineer to enhance our documentation, interactive SQL playground, and cloud dashboard experiences.

### Requirements
- Strong proficiency in modern TypeScript, Next.js, and Postgres.
- Experience authoring open source libraries or engaging with technical developer communities.
- Self-directed with clear written communication in a global async team.`,
  },
  {
    id: 'job-ver-04',
    slug: 'design-engineer-vercel',
    title: 'Design Engineer',
    company: {
      id: 'comp-vercel',
      name: 'Vercel',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://vercel.com',
      isVerified: true,
      domain: 'vercel.com',
    },
    location: {
      city: 'New York',
      state: 'NY',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 170000,
      max: 215000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['React', 'Next.js', 'Tailwind CSS', 'Framer Motion', 'Design Systems', 'CSS/SVG'],
    sources: [
      {
        platform: 'lever',
        url: 'https://jobs.lever.co/vercel/design-eng-1',
        sourceJobId: 'lev-ver-441',
        scrapedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      },
      {
        platform: 'linkedin',
        url: 'https://linkedin.com/jobs/view/vercel-design-eng',
        sourceJobId: 'li-ver-901',
        scrapedAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://vercel.com/careers',
    benefits: ['Flexible Holidays', 'Remote Office Stipend', 'Health Insurance', 'Stock Options'],
    descriptionMarkdown: `### Mission
At Vercel, we empower teams to build the modern web. As a Design Engineer, you will bridge the gap between creative visual design and rock-solid frontend engineering.

### What You'll Build
- Build polished micro-interactions, spring physics transitions, and micro-copy animations.
- Evolve the Geist design system across web, CLI, and mobile preview tools.
- Prototype bleeding-edge React 19 capabilities and Server Components UI patterns.`,
  },
  {
    // MISSING SALARY CASE TO TEST "Salary Undisclosed" BADGE
    id: 'job-fig-05',
    slug: 'frontend-engineer-figma',
    title: 'Frontend Engineer, Web Canvas',
    company: {
      id: 'comp-figma',
      name: 'Figma',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://figma.com',
      isVerified: true,
      domain: 'figma.com',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: false,
    },
    workSetup: 'hybrid',
    jobType: 'full-time',
    experienceLevel: 'mid',
    salary: {
      min: null,
      max: null,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'WebGL', 'WebAssembly', 'C++', 'React', 'Canvas API'],
    sources: [
      {
        platform: 'greenhouse',
        url: 'https://boards.greenhouse.io/figma/jobs/canvas-01',
        sourceJobId: 'gh-fig-0091',
        scrapedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://figma.com/careers',
    benefits: ['On-site Chef Lunches', 'Commuter Benefits', 'Equity Grant', 'Wellness Budget'],
    descriptionMarkdown: `### About the Team
Figma's Canvas team manages the core rendering engine powering collaborative vector graphics in web browsers.

### Requirements
- Strong grounding in computer graphics, 2D vector mathematics, and memory management.
- Proficiency in C++ or Rust compiled to WebAssembly, paired with high-performance TypeScript wrappers.`,
  },
  {
    id: 'job-air-06',
    slug: 'senior-fullstack-engineer-airbnb',
    title: 'Senior Full Stack Engineer, Guest Experiences',
    company: {
      id: 'comp-airbnb',
      name: 'Airbnb',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://airbnb.com',
      isVerified: true,
      domain: 'airbnb.com',
    },
    location: {
      city: 'Seattle',
      state: 'WA',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 195000,
      max: 245000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['React', 'TypeScript', 'Java', 'GraphQL', 'AWS', 'Next.js'],
    sources: [
      {
        platform: 'company_site',
        url: 'https://careers.airbnb.com/positions/senior-fs-guest',
        sourceJobId: 'air-5501',
        scrapedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://careers.airbnb.com',
    benefits: ['Live and Work Anywhere policy', '$2k/year Airbnb Travel Credits', '401k match'],
    descriptionMarkdown: `### Role Description
Join the team shaping the future of global travel. We build reliable booking funnels, search ranking integrations, and messaging architectures used by 500M+ guests worldwide.`,
  },
  {
    id: 'job-ret-07',
    slug: 'frontend-engineer-contract-retool',
    title: 'Frontend Engineer (Design Systems)',
    company: {
      id: 'comp-retool',
      name: 'Retool',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://retool.com',
      isVerified: true,
      domain: 'retool.com',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'contract',
    experienceLevel: 'senior',
    salary: {
      min: 120,
      max: 160,
      currency: 'USD',
      interval: 'hourly',
      isEstimated: false,
    },
    skills: ['React', 'TypeScript', 'Storybook', 'Tailwind CSS', 'Accessibility'],
    sources: [
      {
        platform: 'lever',
        url: 'https://jobs.lever.co/retool/contract-fe-ds',
        sourceJobId: 'lev-ret-109',
        scrapedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 7 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://retool.com/careers',
    descriptionMarkdown: `### 6-Month Contract
We are seeking an experienced Design Systems specialist to audit and refresh 40+ atomic components for keyboard accessibility and token styling consistency.`,
  },
  {
    id: 'job-oai-08',
    slug: 'ai-interface-engineer-openai',
    title: 'AI Frontend & Interaction Engineer',
    company: {
      id: 'comp-openai',
      name: 'OpenAI',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://openai.com',
      isVerified: true,
      domain: 'openai.com',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: false,
    },
    workSetup: 'on-site',
    jobType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 245000,
      max: 370000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'React', 'Next.js', 'Streaming APIs', 'WebSockets', 'Canvas'],
    sources: [
      {
        platform: 'greenhouse',
        url: 'https://boards.greenhouse.io/openai/jobs/ai-fe-01',
        sourceJobId: 'gh-oai-991',
        scrapedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://openai.com/careers',
    benefits: ['Top of Market Equity', 'Full Relocation Assistance', 'Exceptional Medical/Dental/Vision'],
    descriptionMarkdown: `### About the Interaction Team
We develop ChatGPT, Canvas, and voice/multimodal client interfaces. We are looking for engineers with impeccable intuition for response streaming, token rendering, and latency reduction.`,
  },
  {
    id: 'job-dd-09',
    slug: 'junior-frontend-engineer-datadog',
    title: 'Associate Frontend Engineer (Entry Level)',
    company: {
      id: 'comp-datadog',
      name: 'Datadog',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://datadoghq.com',
      isVerified: true,
      domain: 'datadoghq.com',
    },
    location: {
      city: 'Boston',
      state: 'MA',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'hybrid',
    jobType: 'full-time',
    experienceLevel: 'entry',
    salary: {
      min: 110000,
      max: 135000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['JavaScript', 'TypeScript', 'React', 'HTML5/CSS', 'Testing'],
    sources: [
      {
        platform: 'workday',
        url: 'https://datadog.wd1.myworkdayjobs.com/datadog/job/entry-fe',
        sourceJobId: 'wd-dd-1082',
        scrapedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 22 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://careers.datadoghq.com',
    benefits: ['Mentorship Program', 'Education Budget', 'Generous 401(k)'],
    descriptionMarkdown: `### Entry-Level Opportunity
Kickstart your engineering career with world-class mentorship. You'll contribute to live monitoring charts, telemetry inspectors, and accessible UI components.`,
  },
  {
    id: 'job-gh-10',
    slug: 'senior-full-stack-github',
    title: 'Senior Full Stack Engineer, Developer Tools',
    company: {
      id: 'comp-github',
      name: 'GitHub',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://github.com',
      isVerified: true,
      domain: 'github.com',
    },
    location: {
      city: 'Austin',
      state: 'TX',
      country: 'USA',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'senior',
    salary: {
      min: 180000,
      max: 230000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'Ruby', 'React', 'Go', 'GraphQL', 'Tailwind CSS'],
    sources: [
      {
        platform: 'greenhouse',
        url: 'https://boards.greenhouse.io/github/jobs/sr-fs-90',
        sourceJobId: 'gh-git-772',
        scrapedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://github.com/about/careers',
    benefits: ['Home Office Reimbursement', 'Parental Support', 'Health & Wellness'],
    descriptionMarkdown: `### Help shape GitHub
Join the team maintaining GitHub Discussions, Codespaces, and Pull Request review flows. Scale services to 100M+ developers.`,
  },
  {
    id: 'job-int-11',
    slug: 'software-engineering-intern-figma',
    title: 'Frontend Software Engineering Intern (Summer 2027)',
    company: {
      id: 'comp-figma',
      name: 'Figma',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://figma.com',
      isVerified: true,
      domain: 'figma.com',
    },
    location: {
      city: 'San Francisco',
      state: 'CA',
      country: 'USA',
      isRemoteEligible: false,
    },
    workSetup: 'on-site',
    jobType: 'internship',
    experienceLevel: 'entry',
    salary: {
      min: 55,
      max: 65,
      currency: 'USD',
      interval: 'hourly',
      isEstimated: false,
    },
    skills: ['TypeScript', 'React', 'Algorithms', 'CSS'],
    sources: [
      {
        platform: 'greenhouse',
        url: 'https://boards.greenhouse.io/figma/jobs/intern-fe-27',
        sourceJobId: 'gh-fig-int',
        scrapedAt: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 17 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://figma.com/careers',
    benefits: ['Housing Stipend', 'Mentorship Program', 'Team Offsites'],
    descriptionMarkdown: `### 12-Week Paid Internship
Join Figma's product team. Work directly on production features, pair with senior staff, and ship code to millions of creatives.`,
  },
  {
    id: 'job-res-12',
    slug: 'lead-frontend-architect-resend',
    title: 'Lead Frontend Architect',
    company: {
      id: 'comp-resend',
      name: 'Resend',
      logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
      websiteUrl: 'https://resend.com',
      isVerified: true,
      domain: 'resend.com',
    },
    location: {
      city: 'Remote Worldwide',
      state: null,
      country: 'Global',
      isRemoteEligible: true,
    },
    workSetup: 'remote',
    jobType: 'full-time',
    experienceLevel: 'lead',
    salary: {
      min: 210000,
      max: 250000,
      currency: 'USD',
      interval: 'yearly',
      isEstimated: false,
    },
    skills: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Server Components', 'React Email'],
    sources: [
      {
        platform: 'company_site',
        url: 'https://resend.com/careers/lead-frontend',
        sourceJobId: 'res-lead-01',
        scrapedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      },
    ],
    postedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    isDead: false,
    reportCount: 0,
    applyUrl: 'https://resend.com/careers',
    benefits: ['Async First', 'Top Tier Equipment', 'Flexible Time Off', 'Health Insurance'],
    descriptionMarkdown: `### Modern Email for Developers
We are looking for our Lead Frontend Architect to scale the web dashboard, React Email components, and developer analytics engine.`,
  },
];
