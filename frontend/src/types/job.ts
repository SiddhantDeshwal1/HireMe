export type WorkSetup = 'remote' | 'hybrid' | 'on-site';
export type JobType = 'full-time' | 'contract' | 'internship' | 'part-time';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type Currency = 'USD' | 'INR';

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
  interval: 'yearly' | 'monthly' | 'hourly';
  isEstimated: boolean;
}

export interface JobSource {
  platform: 'amazon' | 'google' | 'microsoft' | 'meta' | 'netflix' | 'rubrik' | 'uber' | 'linkedin' | 'greenhouse' | 'lever' | 'workday' | 'company_site' | 'other' | string;
  url: string;
  sourceJobId: string;
  scrapedAt: string;
}

export interface JobPosting {
  id: string;
  slug: string;
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
    isRemoteEligible: boolean;
  };
  workSetup: WorkSetup;
  jobType: JobType;
  experienceLevel: ExperienceLevel;
  salary: SalaryRange;
  descriptionHtml?: string;
  descriptionMarkdown: string;
  skills: string[];
  sources: JobSource[];
  matchScore?: number;
  matchReasons?: string[];
  postedAt: string; // ISO 8601
  updatedAt: string;
  isDead: boolean;
  reportCount: number;
  applyUrl: string;
  benefits?: string[];
  resumeMatchScore?: number;
  resumeMatchLevel?: string;
  matchedResumeSkills?: string[];
  officialJobId?: string;
}

export interface UserPreferences {
  targetRoles: string[];
  experienceLevels: ExperienceLevel[];
  workSetups: WorkSetup[];
  jobTypes: JobType[];
  preferredLocations: string[];
  minSalary: number;
  currency: Currency;
  primaryTechStack: string[];
  remoteOnly: boolean;
  maxPostingAgeDays: number;
  strictMatching: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  onboardingCompleted: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
  savedJobIds: string[];
  reportedJobIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BestProject {
  title: string;
  skills: string[];
  link: string;
  description: string;
}

export interface UserProfileDashboard {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  citizenship: string;
  workAuthorization: string;
  currentTitle: string;
  yearsOfExperience: number;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  leetcodeUrl?: string;
  codeforcesUrl?: string;
  bestProjects?: BestProject[];
  visaSponsorship?: string;
  militaryVeteranStatus?: string;
  governmentEmployee?: string;
  gender?: string;
  raceEthnicity?: string;
  disabilityStatus?: string;
  resumeFileName: string;
  resumeText: string;
  resumeSkills: string[];
  preferences?: UserPreferences;
  updatedAt?: string;
}

export interface CompanyOption {
  name: string;
  count: number;
}

export interface JobFilters {
  searchQuery: string;
  datePosted: 'all' | '24h' | '7d' | '30d';
  workSetups: WorkSetup[];
  jobTypes: JobType[];
  experienceLevels: ExperienceLevel[];
  minSalary: number;
  sortBy: 'relevant' | 'newest' | 'salary';
  page: number;
  companies?: string[];
  matchResume?: boolean;
  resumeSkills?: string[];
}

export interface PaginationDetails {
  page: number;
  limit: number;
  totalMatching: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextCursor?: string | null;
  hasMore?: boolean;
  duplicatesMergedCount?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationDetails;
  fromCache?: boolean;
}

export interface ScraperLog {
  timestamp: string;
  level: string;
  message: string;
  company?: string;
}

export interface ActiveSiteStatus {
  url: string;
  company: string;
  status: string;
  lastScrapedAt: string | null;
  lastNewJobs: number;
  totalFound: number;
  durationMs: number;
  totalInDb: number;
}

export interface AdminScraperStatus {
  isScrapingNow: boolean;
  lastSync: string | null;
  nextSync: string | null;
  secondsUntilNextSync: number;
  totalScrapedAllTime: number;
  lastCycleNewJobs?: number;
  activeSitesCount: number;
  activeSites: ActiveSiteStatus[];
  recentLogs: ScraperLog[];
}

export interface ResumeAnalysisResult {
  success: boolean;
  fileName: string;
  extractedSkills: string[];
  languages: string[];
  frameworks: string[];
  experienceYears: number;
  inferredSeniority: string;
  suggestedRoles: string[];
  profile: UserProfileDashboard;
}

export interface JobApplication {
  id: string;
  username: string;
  job_id: string;
  job_title: string;
  company_name: string;
  company_logo_url: string;
  apply_url: string;
  status: 'applied' | 'not_applied' | 'interviewing' | 'rejected' | 'offered';
  applied_at: string;
  notes?: string;
}


