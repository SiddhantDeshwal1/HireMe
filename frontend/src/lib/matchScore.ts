import { JobPosting, UserPreferences } from '@/types/job';

export function calculateMatchScore(
  job: JobPosting,
  preferences: UserPreferences
): { score: number; reasons: string[] } {
  let score = 50; // baseline score
  const reasons: string[] = [];

  // 1. Role match
  const titleLower = job.title.toLowerCase();
  const matchedRole = preferences.targetRoles.find((role) =>
    titleLower.includes(role.toLowerCase())
  );
  if (matchedRole) {
    score += 20;
    reasons.push(`Matches target role "${matchedRole}"`);
  } else if (preferences.targetRoles.length === 0) {
    score += 10;
  }

  // 2. Work Setup match
  if (preferences.workSetups.includes(job.workSetup)) {
    score += 15;
    if (job.workSetup === 'remote') {
      reasons.push('100% Remote flexibility');
    } else {
      reasons.push(`Preferred ${job.workSetup} work setup`);
    }
  }

  // 3. Experience level match
  if (preferences.experienceLevels.includes(job.experienceLevel)) {
    score += 10;
    reasons.push(`Fits your ${job.experienceLevel} seniority level`);
  }

  // 4. Salary match
  if (job.salary.min && preferences.minSalary > 0) {
    if (job.salary.min >= preferences.minSalary) {
      score += 15;
      const formattedSalary = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }).format(job.salary.min);
      reasons.push(`Salary starting at ${formattedSalary} exceeds your minimum`);
    } else if (job.salary.max && job.salary.max >= preferences.minSalary) {
      score += 8;
      reasons.push(`Salary range overlaps your compensation target`);
    }
  } else if (preferences.minSalary === 0) {
    score += 10;
  }

  // 5. Tech Stack match
  const matchingSkills = job.skills.filter((skill) =>
    preferences.primaryTechStack.some((tech) => tech.toLowerCase() === skill.toLowerCase())
  );

  if (matchingSkills.length > 0) {
    const boost = Math.min(matchingSkills.length * 6, 20);
    score += boost;
    reasons.push(`Matched skills: ${matchingSkills.slice(0, 3).join(', ')}`);
  }

  // Cap between 45 and 99
  const finalScore = Math.min(Math.max(score, 45), 99);

  return {
    score: finalScore,
    reasons: reasons.length > 0 ? reasons : ['General algorithmic match based on profile profile'],
  };
}
