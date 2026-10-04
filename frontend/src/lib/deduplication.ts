import { JobPosting, JobSource } from '@/types/job';

/**
 * Normalizes title for fuzzy comparison
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Merges two source lists removing duplicates by platform and url
 */
function mergeSources(existingSources: JobSource[], newSources: JobSource[]): JobSource[] {
  const map = new Map<string, JobSource>();
  for (const s of [...existingSources, ...newSources]) {
    const key = `${s.platform}_${s.url}`;
    if (!map.has(key)) {
      map.set(key, s);
    }
  }
  return Array.from(map.values());
}

/**
 * Client-side deduplication utility to visually merge jobs with the exact same
 * Title and Company posted within 48 hours (48 * 3600 * 1000 ms).
 */
export function deduplicateJobs(jobs: JobPosting[]): {
  deduplicated: JobPosting[];
  mergedCount: number;
} {
  const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
  const mergedResult: JobPosting[] = [];
  let mergedCount = 0;

  for (const currentJob of jobs) {
    const currentCompNorm = normalizeString(currentJob.company.name);
    const currentTitleNorm = normalizeString(currentJob.title);
    const currentTime = new Date(currentJob.postedAt).getTime();

    // Look for existing candidate in mergedResult
    const existingIndex = mergedResult.findIndex((existingJob) => {
      const existingCompNorm = normalizeString(existingJob.company.name);
      const existingTitleNorm = normalizeString(existingJob.title);
      const existingTime = new Date(existingJob.postedAt).getTime();

      const sameCompanyAndTitle =
        existingCompNorm === currentCompNorm && existingTitleNorm === currentTitleNorm;
      const within48Hours = Math.abs(existingTime - currentTime) <= FORTY_EIGHT_HOURS_MS;

      return sameCompanyAndTitle && within48Hours;
    });

    if (existingIndex !== -1) {
      // Merge into existing job
      const existing = mergedResult[existingIndex];
      const mergedSources = mergeSources(existing.sources, currentJob.sources);

      // Prefer direct company site / greenhouse / lever ATS over job aggregators
      const primaryApplyUrl =
        mergedSources.find((s) => s.platform === 'company_site' || s.platform === 'greenhouse' || s.platform === 'lever')
          ?.url || existing.applyUrl || currentJob.applyUrl;

      // Retain the longer description
      const betterDescription =
        (existing.descriptionMarkdown?.length || 0) >= (currentJob.descriptionMarkdown?.length || 0)
          ? existing.descriptionMarkdown
          : currentJob.descriptionMarkdown;

      // Merge skills uniquely
      const mergedSkills = Array.from(new Set([...existing.skills, ...currentJob.skills]));

      mergedResult[existingIndex] = {
        ...existing,
        sources: mergedSources,
        applyUrl: primaryApplyUrl,
        descriptionMarkdown: betterDescription,
        skills: mergedSkills,
        salary: existing.salary.min ? existing.salary : currentJob.salary,
      };

      mergedCount += 1;
    } else {
      mergedResult.push({ ...currentJob });
    }
  }

  return {
    deduplicated: mergedResult,
    mergedCount,
  };
}
