'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Building2,
  MapPin,
  Clock,
  Sparkles,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  Flame,
  Zap,
} from 'lucide-react';
import { JobPosting } from '@/types/job';
import { usePreferences } from '@/context/PreferencesContext';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

interface JobCardProps {
  job: JobPosting;
  onSelect?: (job: JobPosting) => void;
}

export function JobCard({ job }: JobCardProps) {
  const { isJobSaved, toggleSaveJob, currency } = usePreferences();
  const saved = isJobSaved(job.id);

  // Currency Formatter
  const formattedSalary = () => {
    if (!job.salary.min) return null;
    const isHourly = job.salary.interval === 'hourly';

    if (currency === 'INR') {
      const minINR = isHourly ? job.salary.min * 2000 * 85 : job.salary.min * 85;
      const maxINR = job.salary.max ? (isHourly ? job.salary.max * 2000 * 85 : job.salary.max * 85) : minINR;
      const lpaMin = (minINR / 100000).toFixed(1);
      const lpaMax = (maxINR / 100000).toFixed(1);
      return `₹${lpaMin} - ₹${lpaMax} LPA`;
    }

    // USD default
    if (isHourly) {
      return `$${job.salary.min} - $${job.salary.max || job.salary.min}/hr`;
    }
    const kMin = Math.round(job.salary.min / 1000);
    const kMax = Math.round((job.salary.max || job.salary.min) / 1000);
    return `$${kMin}k - $${kMax}k`;
  };

  // Format posted date into relative time ("2 days ago", "Just now") + exact date ("Oct 3, 2026")
  const formattedPostedTime = () => {
    if (!job.postedAt) return null;
    const postedDate = new Date(job.postedAt);
    if (isNaN(postedDate.getTime())) return null;

    const now = new Date();
    const diffHours = (now.getTime() - postedDate.getTime()) / (1000 * 60 * 60);

    let relative = 'Just now';
    if (diffHours >= 48) {
      const days = Math.floor(diffHours / 24);
      relative = `${days} days ago`;
    } else if (diffHours >= 24) {
      relative = '1 day ago';
    } else if (diffHours >= 2) {
      relative = `${Math.floor(diffHours)} hours ago`;
    } else if (diffHours >= 1) {
      relative = '1 hour ago';
    }

    const dateFormatted = postedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return { relative, dateFormatted };
  };

  const postedInfo = formattedPostedTime();
  const compLogo = `/logos/${job.company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
  const matchedSkillsSet = new Set((job.matchedResumeSkills || []).map((s) => s.toLowerCase()));

  // Resume Match Badge Styling (Requirement 7)
  const renderResumeMatchBadge = () => {
    if (!job.resumeMatchLevel || job.resumeMatchLevel === 'Standard') return null;

    if (job.resumeMatchLevel === 'Strong Match') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 to-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-xs sm:text-sm font-bold shadow-xs">
          <Flame className="w-4 h-4 text-emerald-500 fill-emerald-500" />
          Strong Match
        </span>
      );
    }
    if (job.resumeMatchLevel === 'Good Match') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500/15 to-indigo-600/20 text-violet-700 dark:text-violet-300 border border-violet-500/40 text-xs sm:text-sm font-bold shadow-xs">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Good Match
        </span>
      );
    }
    if (job.resumeMatchLevel === 'Moderate Match') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40 text-xs sm:text-sm font-bold shadow-xs">
          <Zap className="w-4 h-4 text-amber-500" />
          Moderate Match
        </span>
      );
    }
    return null;
  };

  return (
    <Link href={`/jobs/${job.id}`} className="block group">
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98 }}
        whileHover={{ y: -3, transition: { duration: 0.2, ease: 'easeOut' } }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-6 sm:p-7 bg-card hover:bg-card/95 border-border/80 hover:border-violet-500/50 transition-all rounded-3xl shadow-sm hover:shadow-xl hover:shadow-violet-500/5 relative overflow-hidden">
          {/* Subtle top indicator on hover */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-violet-500/0 group-hover:via-violet-500/70 to-transparent transition-all" />

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            {/* Left Info */}
            <div className="flex items-start gap-4 flex-1 min-w-0">
              {/* Company Logo Image */}
              <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center p-3 shrink-0 shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                <img
                  src={compLogo}
                  alt={job.company.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-black text-violet-600">${job.company.name.charAt(0)}</span>`;
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {/* Title & Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl sm:text-2xl font-black text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors tracking-tight leading-snug">
                    {job.title}
                  </h3>

                  {job.company.isVerified && (
                    <Badge variant="outline" className="text-xs px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </Badge>
                  )}

                  {job.officialJobId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-secondary/90 text-muted-foreground border border-border text-xs font-mono font-bold tracking-tight">
                      ID: #{job.officialJobId}
                    </span>
                  )}

                  {renderResumeMatchBadge()}
                </div>

                {/* Company & Core Keywords (Requirement 4) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:text-base text-muted-foreground font-semibold">
                  <span className="font-extrabold text-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-violet-500" />
                    {job.company.name}
                  </span>

                  <span className="flex items-center gap-1.5 font-medium">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    {job.workSetup === 'remote' ? '100% Remote' : (job.location.city ? `${job.location.city}, ${job.location.country}` : job.location.country)}
                  </span>

                  <span className="capitalize px-2.5 py-1 rounded-xl bg-secondary text-xs sm:text-sm font-bold text-foreground">
                    {job.workSetup}
                  </span>

                  <span className="capitalize px-2.5 py-1 rounded-xl bg-secondary text-xs sm:text-sm font-bold text-foreground">
                    {job.jobType}
                  </span>

                  <span className="capitalize px-2.5 py-1 rounded-xl bg-secondary text-xs sm:text-sm font-bold text-foreground">
                    {job.experienceLevel} Level
                  </span>

                  {postedInfo && (
                    <span className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                      <span>{postedInfo.relative}</span>
                      <span className="opacity-40">•</span>
                      <span>{postedInfo.dateFormatted}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Bookmark & Salary */}
            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {/* Match Score from profile algorithm if present */}
                {job.matchScore !== undefined && job.matchScore > 0 && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 text-xs sm:text-sm font-mono font-bold shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    {job.matchScore}% Match
                  </div>
                )}

                {/* Bookmark Toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleSaveJob(job.id);
                  }}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                    saved
                      ? 'bg-violet-600/15 text-violet-600 border-violet-500/50 shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-violet-400'
                  }`}
                  title={saved ? 'Remove bookmark' : 'Bookmark job'}
                >
                  <Bookmark className={`w-5 h-5 ${saved ? 'fill-violet-600 text-violet-600' : ''}`} />
                </button>
              </div>

              {/* Salary Badge */}
              <div className="pt-1">
                {formattedSalary() ? (
                  <span className="text-base sm:text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {formattedSalary()}
                  </span>
                ) : (
                  <span className="text-xs sm:text-sm px-3 py-1 rounded-xl bg-secondary/80 text-muted-foreground font-bold">
                    Competitive Rate
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Skills & View CTA Row (Requirement 4: Technical Skills) */}
          <div className="mt-5 pt-4 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
                Required Skills:
              </span>
              {job.skills.map((skill) => {
                const isMatched = matchedSkillsSet.has(skill.toLowerCase());
                return (
                  <span
                    key={skill}
                    className={`text-xs sm:text-sm font-semibold px-3 py-1 rounded-xl transition-all ${
                      isMatched
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 shadow-xs'
                        : 'bg-secondary text-foreground group-hover:border-border/80'
                    }`}
                  >
                    {isMatched && <span className="mr-1">✓</span>}
                    {skill}
                  </span>
                );
              })}
              {job.skills.length === 0 && (
                <span className="text-xs sm:text-sm text-muted-foreground italic">
                  Software Engineering & Problem Solving
                </span>
              )}
            </div>

            <span className="text-xs sm:text-sm font-extrabold text-violet-600 dark:text-violet-400 flex items-center gap-1.5 group-hover:translate-x-1.5 transition-transform shrink-0 self-end sm:self-auto">
              <span>View Full Details</span>
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}
