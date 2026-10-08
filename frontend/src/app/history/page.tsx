'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Building2,
  Calendar,
  ExternalLink,
  Trash2,
  Search,
  CheckCircle2,
  ArrowRight,
  Briefcase,
  Sparkles,
  Compass,
} from 'lucide-react';
import { JobApplication } from '@/types/job';
import { deleteJobApplication, fetchJobApplications } from '@/lib/api';
import { usePreferences } from '@/context/PreferencesContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { getCompanyLogo, getCanonicalCompanyName } from '@/lib/companyLogo';

export default function ApplicationHistoryPage() {
  const { currentUser } = usePreferences();
  const username = currentUser?.username || 'admin';

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchJobApplications(username);
      setApplications(data);
    } catch (err) {
      console.error('Failed to load application history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [username]);

  const handleDelete = async (appId: string, jobTitle: string) => {
    try {
      const success = await deleteJobApplication(appId, username);
      if (success) {
        setApplications((prev) => prev.filter((a) => a.id !== appId));
        toast.success(`Removed "${jobTitle}" from application history.`);
      }
    } catch (err) {
      toast.error('Failed to remove application record.');
      console.error(err);
    }
  };

  const filteredApplications = applications.filter((app) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = app.job_title.toLowerCase().includes(q);
      const matchComp = app.company_name.toLowerCase().includes(q);
      if (!matchTitle && !matchComp) return false;
    }
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const uniqueCompanies = new Set(applications.map((a) => a.company_name)).size;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return 'Just now';
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border/70 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <History className="w-8 h-8 text-violet-500" />
              Application History
            </h1>
            <Badge variant="outline" className="text-xs sm:text-sm bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold px-3 py-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              Verified Submissions
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 font-medium">
            Keep track of every role you have officially applied to across monitored company career portals.
          </p>
        </div>

        <Link href="/dashboard">
          <Button className="rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold h-11 px-5 gap-2 shadow-sm">
            <Compass className="w-4 h-4" />
            <span>Find More Roles</span>
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Total Applied Roles
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-foreground">
              {applications.length}
            </span>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Companies Contacted
            </span>
            <span className="text-2xl font-black font-mono tracking-tight text-foreground">
              {uniqueCompanies}
            </span>
          </div>
        </Card>

        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Sync Engine
            </span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              Auto-saved to SQLite
            </span>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by role title or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-sm font-medium rounded-xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 text-xs sm:text-sm font-bold rounded-xl bg-secondary/60 border border-border text-foreground cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="applied">Applied</option>
            <option value="interviewing">Interviewing</option>
          </select>
        </div>
      </div>

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-3xl bg-card animate-pulse border border-border/60" />
          ))}
        </div>
      ) : filteredApplications.length === 0 ? (
        <Card className="p-12 rounded-3xl bg-card border-border text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/80 border border-border flex items-center justify-center text-muted-foreground">
            <History className="w-8 h-8 text-violet-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-foreground">
              {searchQuery ? 'No matching applications found' : 'No applied roles recorded yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto font-medium">
              When you click &ldquo;Apply on Official Site&rdquo; on any job posting and confirm your submission, it will appear here in your permanent record.
            </p>
          </div>
          <Link href="/dashboard" className="inline-block pt-2">
            <Button className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold gap-2">
              <Compass className="w-4 h-4" />
              <span>Browse Open Roles</span>
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredApplications.map((app) => {
              const compLogo = getCompanyLogo(app.company_name, undefined, app.company_logo_url);
              const canonicalName = getCanonicalCompanyName(app.company_name);
              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  <Card className="p-6 bg-card border-border hover:border-violet-500/40 rounded-3xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Logo and Titles */}
                    <div className="flex items-start gap-4 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center p-2.5 shrink-0 overflow-hidden shadow-xs">
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

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/jobs/${app.job_id}`}
                            className="text-lg sm:text-xl font-black text-foreground hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate"
                          >
                            {app.job_title}
                          </Link>
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold px-2.5 py-0.5">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Applied
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground font-semibold">
                          <span className="text-foreground font-bold flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-violet-500" />
                            {app.company_name}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Applied {formatDate(app.applied_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <a
                        href={app.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl border-border font-bold text-xs h-10 px-3.5 gap-1.5"
                        >
                          <span>Portal Link</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </a>

                      <Link href={`/jobs/${app.job_id}`}>
                        <Button
                          size="sm"
                          className="rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-10 px-4 gap-1.5 shadow-xs"
                        >
                          <span>View Role</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(app.id, app.job_title)}
                        className="rounded-xl h-10 w-10 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
