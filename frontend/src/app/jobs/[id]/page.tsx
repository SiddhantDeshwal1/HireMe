'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  MapPin,
  ExternalLink,
  Bookmark,
  Sparkles,
  CheckCircle2,
  Calendar,
  Briefcase,
  Layers,
  Flag,
  DollarSign,
  Share2,
  Clock,
} from 'lucide-react';
import { JobPosting } from '@/types/job';
import { usePreferences } from '@/context/PreferencesContext';
import { fetchJobById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  const { currency, isJobSaved, toggleSaveJob, reportJobDead, profile } = usePreferences();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let isCancelled = false;

    async function loadJob() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchJobById(jobId, profile.preferences);
        if (!isCancelled) {
          if (data) {
            setJob(data);
          } else {
            setError('Job not found.');
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError('Failed to load job opening details.');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadJob();
    return () => {
      isCancelled = true;
    };
  }, [jobId, profile.preferences]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 w-full flex-1">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 bg-muted rounded-lg" />
          <div className="h-20 bg-muted rounded-2xl" />
          <div className="h-64 bg-muted rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-3">Job Listing Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6">
          This listing may have expired or was de-indexed by our automated scrapers.
        </p>
        <Link href="/dashboard">
          <Button variant="default" className="gap-2 font-bold">
            <ArrowLeft className="w-4 h-4" />
            Back to Curated Feed
          </Button>
        </Link>
      </div>
    );
  }

  const saved = isJobSaved(job.id);

  // Currency Formatter (USD vs INR)
  const formatSalary = () => {
    if (!job.salary.min) return 'Competitive / Market Rate';
    const isHourly = job.salary.interval === 'hourly';

    if (currency === 'INR') {
      const minINR = isHourly ? job.salary.min * 2000 * 85 : job.salary.min * 85;
      const maxINR = job.salary.max ? (isHourly ? job.salary.max * 2000 * 85 : job.salary.max * 85) : minINR;
      const lpaMin = (minINR / 100000).toFixed(1);
      const lpaMax = (maxINR / 100000).toFixed(1);
      return `₹${lpaMin} - ₹${lpaMax} LPA`;
    }

    // USD
    if (isHourly) {
      return `$${job.salary.min} - $${job.salary.max || job.salary.min}/hr`;
    }
    const kMin = Math.round(job.salary.min / 1000);
    const kMax = Math.round((job.salary.max || job.salary.min) / 1000);
    return `$${kMin}k - $${kMax}k / year`;
  };

  const formattedPostedTime = () => {
    if (!job?.postedAt) return null;
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: job.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Listing link copied to clipboard!');
    }
  };

  const handleReport = async () => {
    await reportJobDead(job.id, 'broken_link');
    toast.info('Report submitted. Our automated pipeline will verify this listing.');
  };

  const compLogo = `/logos/${job.company.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
      {/* Back Button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
        <span>Back to Job Feed</span>
      </Link>

      {/* Main Container Card */}
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-8">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-border/60">
          <div className="flex items-start gap-4 flex-1">
            {/* Company Logo / Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center p-2 shrink-0 shadow-sm overflow-hidden">
              <img
                src={compLogo}
                alt={job.company.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback letter if logo svg not available
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = `<span class="text-2xl font-bold text-violet-600">${job.company.name.charAt(0)}</span>`;
                }}
              />
            </div>

            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-violet-500" />
                  {job.company.name}
                </span>
                {job.company.isVerified && (
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Verified Career Board
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-snug">
                {job.title}
              </h1>

              {/* Badges / Metadata row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-secondary text-foreground font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {job.workSetup === 'remote' ? '100% Remote' : job.location.city || job.location.country}
                </span>

                <span className="capitalize px-3 py-1 rounded-lg bg-secondary text-foreground font-semibold">
                  {job.workSetup}
                </span>

                <span className="capitalize px-3 py-1 rounded-lg bg-secondary text-foreground font-semibold">
                  {job.jobType}
                </span>

                <span className="capitalize px-3 py-1 rounded-lg bg-secondary text-foreground font-semibold">
                  {job.experienceLevel} Level
                </span>

                {job.matchScore && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-500/15 text-violet-700 dark:text-violet-300 font-bold border border-violet-500/30">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                    {job.matchScore}% Match
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex sm:flex-col items-center sm:items-end gap-3 shrink-0">
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold px-6 shadow-md shadow-violet-600/20 gap-2 h-11"
              >
                <span>Apply on Official Site</span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nowSaved = toggleSaveJob(job.id);
                  toast(nowSaved ? 'Role bookmarked' : 'Bookmark removed');
                }}
                className={`gap-1.5 h-9 font-semibold text-xs border-border/80 ${
                  saved ? 'bg-violet-500/10 text-violet-600 border-violet-500/40' : ''
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-violet-600 text-violet-600' : ''}`} />
                <span>{saved ? 'Saved' : 'Save'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground border-border/80"
                title="Share job opening"
              >
                <Share2 className="w-3.5 h-3.5" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReport}
                className="h-9 px-2.5 text-xs text-muted-foreground hover:text-rose-600 border-border/80"
                title="Report expired/broken link"
              >
                <Flag className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Target Compensation
            </span>
            <span className="text-lg font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
              {formatSalary()}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-violet-500" />
              Date Posted
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">
                {postedInfo ? postedInfo.relative : 'Recently'}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                {postedInfo ? postedInfo.dateFormatted : new Date(job.postedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold block mb-1 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              Scraper Source
            </span>
            <span className="text-sm font-bold text-foreground capitalize">
              {job.sources[0]?.platform || 'Direct ATS'}
            </span>
          </div>
        </div>

        {/* Matched Skills */}
        {job.skills.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold tracking-tight text-foreground uppercase tracking-wider">
              Relevant Tech Stack & Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 text-xs font-bold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Full Formatted Description */}
        <div className="space-y-4 pt-4 border-t border-border/60">
          <h3 className="text-base font-extrabold text-foreground">
            Job Description & Qualifications
          </h3>

          <div
            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none text-foreground leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{
              __html:
                job.descriptionHtml ||
                job.descriptionMarkdown
                  .replace(/\n\n/g, '<br/><br/>')
                  .replace(/### (.*?)\n/g, '<h4 class="font-bold text-base text-foreground mt-4 mb-2">$1</h4>')
                  .replace(/- (.*?)\n/g, '<li class="ml-4 list-disc">$1</li>'),
            }}
          />
        </div>

        {/* Bottom Apply CTA Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-cyan-500/10 border border-violet-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-bold text-foreground">Interested in this role at {job.company.name}?</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submit your application directly through their official career portal.
            </p>
          </div>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0"
          >
            <Button className="bg-violet-600 hover:bg-violet-500 text-white font-bold gap-2">
              <span>Apply Now</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
