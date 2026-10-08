'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Play,
  RotateCw,
  Plus,
  Clock,
  Database,
  Building2,
  ExternalLink,
  ShieldAlert,
  Filter,
  Pause,
  Server,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Radio,
  Search,
} from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { ActiveSiteStatus, AdminScraperStatus, ScraperLog } from '@/types/job';
import { addAdminCareerLink, fetchAdminScraperStatus, triggerAdminScrape } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getCompanyLogo, getCanonicalCompanyName } from '@/lib/companyLogo';

export default function AdminScraperDashboard() {
  const router = useRouter();
  const { currentUser } = usePreferences();
  const isAdmin = currentUser?.role === 'admin';

  const [statusData, setStatusData] = useState<AdminScraperStatus | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [isLiveStreamActive, setIsLiveStreamActive] = useState(true);

  // Add Link Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCareerUrl, setNewCareerUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Stream filter
  const [logFilterLevel, setLogFilterLevel] = useState<'all' | 'new_jobs' | 'sync'>('all');
  const [portalSearch, setPortalSearch] = useState('');

  // Poll scraper telemetry every 3 seconds
  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const data = await fetchAdminScraperStatus();
        if (isMounted) {
          setStatusData(data);
          if (data.secondsUntilNextSync !== undefined) {
            setSecondsRemaining(data.secondsUntilNextSync);
          }
        }
      } catch (err) {
        console.error('Failed to load scraper status:', err);
      }
    }

    loadStatus();

    const interval = setInterval(() => {
      if (isLiveStreamActive) {
        loadStatus();
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isLiveStreamActive]);

  // Smooth local countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleTriggerScrape = async () => {
    setIsTriggering(true);
    setSecondsRemaining(300); // Immediately reset timer to 5 mins
    const toastId = toast.loading('Initiating live scrape across all career portals...');
    try {
      const res = await triggerAdminScrape();
      toast.success(res.message, { id: toastId });
      setSecondsRemaining(300);
      const refreshed = await fetchAdminScraperStatus();
      setStatusData(refreshed);
    } catch (err) {
      toast.error('Failed to trigger live scraper sweep.', { id: toastId });
      console.error(err);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleAddLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCareerUrl.trim()) return;

    setIsAddingLink(true);
    try {
      const res = await addAdminCareerLink(newCareerUrl.trim());
      if (res.status === 'active') {
        toast.success('Career Portal Activated', {
          description: `Added to active tracking rotation. Scraping initialized.`,
        });
      } else {
        toast.info('New Portal Registered', {
          description: `Queued into new_links.txt for LLM scraper adapter onboarding.`,
        });
      }
      setNewCareerUrl('');
      setShowAddModal(false);
      const refreshed = await fetchAdminScraperStatus();
      setStatusData(refreshed);
    } catch (err) {
      toast.error('Failed to register link.');
      console.error(err);
    } finally {
      setIsAddingLink(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[70vh]">
        <Card className="max-w-md w-full p-8 rounded-3xl bg-card border-border shadow-xl text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-foreground">
            Admin Access Required
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Scraper Monitor is restricted to admin credentials. Sign in with the administrator account to access live pipeline telemetry.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold h-11"
          >
            Return to Job Feed
          </Button>
        </Card>
      </div>
    );
  }

  const isScraping = statusData?.isScrapingNow || isTriggering;

  const filteredLogs = (statusData?.recentLogs || []).filter((log) => {
    if (logFilterLevel === 'new_jobs') {
      return log.level === 'SUCCESS' && (log.message.includes('+') || log.message.toLowerCase().includes('new'));
    }
    if (logFilterLevel === 'sync') {
      return log.level === 'SYNC' || log.level === 'INFO';
    }
    return true;
  });

  const filteredSites = (statusData?.activeSites || []).filter((site) =>
    site.company.toLowerCase().includes(portalSearch.toLowerCase()) ||
    site.url.toLowerCase().includes(portalSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/70 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Scraper Monitor
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                Live Pipeline
              </span>
              {(statusData?.lastCycleNewJobs || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                  +{statusData?.lastCycleNewJobs} New Found
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Real-time multi-board crawling, automated 5-minute SQLite database sync, and TLS session management.
            </p>
          </div>
        </div>

        {/* Primary Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="rounded-2xl border-border font-bold text-xs sm:text-sm h-11 px-4 gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Add Career Link</span>
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerScrape}
            disabled={isScraping}
            className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-11 px-5 gap-2 shadow-sm"
          >
            <Play className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Scraping in Progress...' : 'Scrape Live Now'}</span>
          </Button>
        </div>
      </div>

      {/* High-Signal Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Next Sync Countdown */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Next Sync Query
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {formatCountdown(secondsRemaining)}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                (5m cycle)
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 2: Scraper Engine State */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isScraping
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            <RotateCw className={`w-6 h-6 ${isScraping ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Engine Status
            </span>
            <span
              className={`text-2xl font-black tracking-tight ${
                isScraping ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isScraping ? 'Syncing...' : 'Ready / Idle'}
            </span>
          </div>
        </Card>

        {/* Metric 3: Active Tracked Portals */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Active Portals
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {statusData?.activeSitesCount || 7}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">
                in rotation
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 4: Jobs Stored in Database */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Stored in SQLite
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {statusData?.totalScrapedAllTime || 128}
              </span>
              <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                5-Day TTL
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Layout: Active Portals (Left) + Activity Stream (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Tracked Career Portals */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 rounded-3xl bg-card border-border shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/70 gap-2">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-black text-foreground">
                  Tracked Portals ({filteredSites.length})
                </h2>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter portal..."
                  value={portalSearch}
                  onChange={(e) => setPortalSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredSites.map((site: ActiveSiteStatus, idx: number) => {
                const logoPath = getCompanyLogo(site.company, site.url);
                const canonicalName = getCanonicalCompanyName(site.company, site.url);
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-secondary/30 border border-border/80 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    {/* Logo & Portal Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-card border border-border flex items-center justify-center p-2.5 shrink-0 shadow-xs">
                        <img
                          src={logoPath}
                          alt={canonicalName}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.endsWith('.png')) {
                              target.src = target.src.replace(/\.png$/, '.svg');
                            } else {
                              target.style.display = 'none';
                              if (target.parentElement) {
                                target.parentElement.innerHTML = `<span class="font-black text-emerald-600 text-base">${canonicalName.charAt(0)}</span>`;
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-foreground truncate">
                            {site.company}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        </div>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-muted-foreground font-mono hover:text-emerald-500 flex items-center gap-1 truncate"
                        >
                          <span className="truncate max-w-[220px] sm:max-w-xs">{site.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Stats & Actions */}
                    <div className="shrink-0 flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <div className="flex flex-col sm:items-end text-xs font-mono">
                        <span className="font-bold text-foreground flex items-center gap-1">
                          <Database className="w-3.5 h-3.5 text-violet-500" />
                          {site.totalInDb} in DB
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          {site.lastNewJobs > 0 ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              +{site.lastNewJobs} new
                            </span>
                          ) : (
                            '0 new (merged)'
                          )}{' '}
                          • {site.durationMs}ms
                        </span>
                      </div>

                      <Link href={`/dashboard?company=${encodeURIComponent(site.company)}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 rounded-xl text-xs font-bold text-violet-600 hover:text-violet-700 hover:bg-violet-500/10 gap-1"
                        >
                          <span>Feed</span>
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: High-Signal Activity Audit Feed */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 rounded-3xl bg-card border-border shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-black text-foreground">
                  Ingestion Activity Stream
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                  isLiveStreamActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}
              >
                {isLiveStreamActive ? (
                  <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                ) : (
                  <Pause className="w-3 h-3" />
                )}
                <span>{isLiveStreamActive ? 'Live Polling' : 'Paused'}</span>
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-secondary/60 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogFilterLevel('all')}
                className={`py-1.5 rounded-lg transition-all ${
                  logFilterLevel === 'all'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Events
              </button>
              <button
                type="button"
                onClick={() => setLogFilterLevel('new_jobs')}
                className={`py-1.5 rounded-lg transition-all ${
                  logFilterLevel === 'new_jobs'
                    ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                New Jobs
              </button>
              <button
                type="button"
                onClick={() => setLogFilterLevel('sync')}
                className={`py-1.5 rounded-lg transition-all ${
                  logFilterLevel === 'sync'
                    ? 'bg-card text-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sync Status
              </button>
            </div>

            {/* Activity Stream List */}
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs italic">
                  No activity entries matching this filter.
                </div>
              ) : (
                filteredLogs.map((log: ScraperLog, idx: number) => {
                  const timeStr = new Date(log.timestamp).toLocaleTimeString();
                  const isSuccess = log.level === 'SUCCESS';
                  const isSync = log.level === 'SYNC';
                  const isWarn = log.level === 'WARNING' || log.level === 'ERROR';

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-secondary/30 border border-border/70 hover:bg-secondary/50 transition-colors text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase font-mono ${
                              isSuccess
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : isSync
                                ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30'
                                : isWarn
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                                : 'bg-secondary text-muted-foreground'
                            }`}
                          >
                            {log.level}
                          </span>
                          {log.company && (
                            <span className="font-extrabold text-foreground">
                              @{log.company}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {timeStr}
                        </span>
                      </div>
                      <p className="text-foreground font-medium leading-relaxed">
                        {log.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Career Portal Link Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl relative space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">
                      Add Career Portal to Pipeline
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Register career URLs into the automated scraper worker
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="text-muted-foreground hover:text-foreground p-1 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddLinkSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    Career Page / Search URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://careers.company.com/search or https://company.jobs"
                    value={newCareerUrl}
                    onChange={(e) => setNewCareerUrl(e.target.value)}
                    className="w-full h-11 px-3.5 text-xs sm:text-sm font-medium rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-foreground font-mono"
                  />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Known portals activate directly into <code>links.txt</code>. Unrecognized links queue into <code>new_links.txt</code> for LLM scraper adapter generation.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs font-semibold rounded-xl h-10 px-4"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddingLink}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 h-10 rounded-xl shadow-xs"
                  >
                    {isAddingLink ? 'Registering...' : 'Register Portal'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
