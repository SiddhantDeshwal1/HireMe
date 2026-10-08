'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  DollarSign,
  Sparkles,
  Bookmark,
  ExternalLink,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Share2,
  Check,
  Clock,
} from 'lucide-react';
import { JobPosting } from '@/types/job';
import { usePreferences } from '@/context/PreferencesContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { setPendingApplication } from '@/lib/api';
import { getCompanyLogo, getCanonicalCompanyName } from '@/lib/companyLogo';

interface JobDetailsSheetProps {
  job: JobPosting | null;
  isOpen: boolean;
  onClose: () => void;
}

export function JobDetailsSheet({ job, isOpen, onClose }: JobDetailsSheetProps) {
  const { isJobSaved, toggleSaveJob, reportJobDead, isJobReported } = usePreferences();
  const [isReportingOpen, setIsReportingOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>('expired');
  const [isCopied, setIsCopied] = useState(false);

  if (!job) return null;

  const compLogo = getCompanyLogo(job.company.name, job.company.domain, job.company.logoUrl);
  const canonicalName = getCanonicalCompanyName(job.company.name, job.company.domain);

  const saved = isJobSaved(job.id);
  const reported = isJobReported(job.id);

  const formattedSalary =
    job.salary.min !== null
      ? job.salary.interval === 'hourly'
        ? `$${job.salary.min} - $${job.salary.max} / hr`
        : `$${Math.round(job.salary.min / 1000)}k - $${Math.round(
            (job.salary.max || job.salary.min) / 1000
          )}k / yr`
      : null;

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

  const handleToggleSave = () => {
    const isNowSaved = toggleSaveJob(job.id);
    if (isNowSaved) {
      toast.success('Role bookmarked', {
        description: `Saved "${job.title}" at ${job.company.name}.`,
      });
    } else {
      toast.info('Bookmark removed');
    }
  };

  const handleReportDead = async () => {
    await reportJobDead(job.id, reportReason);
    setIsReportingOpen(false);
    toast.error('Dead link reported', {
      description: 'Our scraper crawler has flagged this listing for de-indexing.',
    });
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-card/95 backdrop-blur-xl border-l border-border/80 p-0 flex flex-col z-50 overflow-hidden shadow-2xl"
      >
        {/* Header container */}
        <SheetHeader className="p-6 border-b border-border/60 bg-secondary/30 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center p-2.5 shrink-0 shadow-sm overflow-hidden">
                <img
                  src={compLogo}
                  alt={canonicalName}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src.endsWith('.png')) {
                      target.src = target.src.replace(/\.png$/, '.svg');
                    } else {
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerHTML = `<span class="text-xl font-black text-violet-600">${canonicalName.charAt(0)}</span>`;
                      }
                    }
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    {canonicalName}
                  </span>
                  {job.company.isVerified && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 inline" /> Verified ATS
                    </Badge>
                  )}
                </div>
                <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                  {job.title}
                </SheetTitle>
              </div>
            </div>

            {/* Quick Actions (Share, Bookmark) */}
            <div className="flex items-center gap-1.5 pr-8">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleShare}
                className="text-muted-foreground hover:text-foreground"
                title="Share link"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </Button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={handleToggleSave}
                className={`p-2 rounded-lg transition-colors ${
                  saved
                    ? 'text-violet-400 bg-violet-500/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={saved ? 'Remove from saved' : 'Save role'}
              >
                <Bookmark className={`w-4 h-4 ${saved ? 'fill-violet-400' : ''}`} />
              </motion.button>
            </div>
          </div>

          {/* Metadata pill row */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground mt-3">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              {job.workSetup === 'remote' ? '100% Remote' : `${job.location.city || ''}, ${job.location.country}`}
            </span>
            <span>•</span>
            <span className="capitalize">{job.workSetup}</span>
            <span>•</span>
            <span className="capitalize">{job.jobType}</span>
            <span>•</span>
            <span className="capitalize">{job.experienceLevel} Level</span>
            <span>•</span>
            {formattedSalary ? (
              <span className="font-mono font-semibold text-emerald-400 flex items-center gap-0.5">
                <DollarSign className="w-3.5 h-3.5" />
                {formattedSalary}
              </span>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-secondary text-muted-foreground border-border">
                Salary Undisclosed
              </Badge>
            )}
            {postedInfo && (
              <>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>{postedInfo.relative}</span>
                  <span className="opacity-40">({postedInfo.dateFormatted})</span>
                </span>
              </>
            )}
          </div>
        </SheetHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Match Score Reason Breakdown */}
          {job.matchScore && (
            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-400" />
                  <span className="text-xs font-bold text-violet-300">
                    Calculated Match Score: {job.matchScore}%
                  </span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Based on your Onboarding
                </span>
              </div>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {job.matchReasons?.map((reason, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-foreground/90">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Deduplication & Sources breakdown */}
          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Scraped Source Origins:</span>
              <span className="text-[11px] font-mono text-emerald-400">
                {job.sources.length} {job.sources.length === 1 ? 'Source' : 'Merged Sources'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {job.sources.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono bg-card border border-border/80 hover:border-violet-500/40 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Globe className="w-3 h-3 text-violet-400" />
                  <span className="uppercase">{s.platform}</span>
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              ))}
            </div>
          </div>

          {/* Required Skills */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
              Technology Stack
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {job.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs bg-secondary/60 text-foreground border-border/80"
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          <Separator className="bg-border/60" />

          {/* Full Markdown Description */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Job Description & Scope
            </h4>
            <div className="prose prose-invert prose-xs text-xs leading-relaxed text-muted-foreground space-y-3">
              {job.descriptionMarkdown.split('\n\n').map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                Stipends & Benefits
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {job.benefits.map((benefit, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-card/50 border border-border/60 flex items-center gap-2 text-foreground/90"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Dead Link section */}
          <div className="pt-4 border-t border-border/60">
            {reported ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>You reported this listing. Scraper telemetry is de-indexing duplicate references.</span>
              </div>
            ) : isReportingOpen ? (
              <div className="p-3.5 rounded-xl bg-card border border-destructive/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" /> Report Inactive / Dead Listing
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsReportingOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <div className="space-y-1.5 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportReason"
                      value="expired"
                      checked={reportReason === 'expired'}
                      onChange={() => setReportReason('expired')}
                      className="accent-violet-500"
                    />
                    <span>Role is closed or application portal unavailable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportReason"
                      value="404"
                      checked={reportReason === '404'}
                      onChange={() => setReportReason('404')}
                      className="accent-violet-500"
                    />
                    <span>Direct ATS link returns 404 / broken page</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reportReason"
                      value="spam"
                      checked={reportReason === 'spam'}
                      onChange={() => setReportReason('spam')}
                      className="accent-violet-500"
                    />
                    <span>Misleading salary, spam, or recruiter repost</span>
                  </label>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReportDead}
                  className="w-full text-xs font-semibold"
                >
                  Confirm & Submit Report
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReportingOpen(true)}
                className="w-full text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" />
                Report Dead Link or Expired Job
              </Button>
            )}
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="p-4 border-t border-border/80 bg-background/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-muted-foreground hidden sm:block">
            Direct canonical application via verified ATS
          </div>
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (job) {
                setPendingApplication({
                  jobId: job.id,
                  jobTitle: job.title,
                  companyName: job.company.name,
                  companyLogoUrl: job.company.logoUrl,
                  applyUrl: job.applyUrl,
                });
              }
            }}
            className="flex-1 sm:flex-initial"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-8 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold text-xs shadow-lg shadow-violet-600/25 rounded-xl gap-2"
              >
                <span>Apply on Company Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
