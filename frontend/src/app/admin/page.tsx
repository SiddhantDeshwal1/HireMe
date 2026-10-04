'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Terminal,
  ExternalLink,
  ShieldAlert,
  Filter,
  Pause,
  Server,
  Sparkles,
} from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { ActiveSiteStatus, AdminScraperStatus, ScraperLog } from '@/types/job';
import { addAdminCareerLink, fetchAdminScraperStatus, triggerAdminScrape } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

  // Log filter
  const [logFilterCompany, setLogFilterCompany] = useState<string>('all');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll scraper telemetry every 3.5 seconds
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
    }, 3500);

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
    setSecondsRemaining(300); // Immediately reset timer to 5 mins (Requirement 4)
    const toastId = toast.loading('Initiating live scrape across all career portals...');
    try {
      const res = await triggerAdminScrape();
      toast.success(res.message, { id: toastId });
      // Reset timer to 5 minutes upon successful trigger
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
          description: `Queued into new_links.txt. Scraper adapter onboarding pipeline notified.`,
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
    if (logFilterCompany === 'all') return true;
    return log.company?.toLowerCase() === logFilterCompany.toLowerCase();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/70 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Scraper Monitor
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Pipeline
              </span>
              {(statusData?.lastCycleNewJobs || 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  +{statusData?.lastCycleNewJobs} New Found
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium">
              Multi-portal crawlers, TLS browser impersonation, and automated 5-minute database sync.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="rounded-xl border-border font-bold text-xs sm:text-sm h-10 px-4 gap-2"
          >
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Add Career Link</span>
          </Button>

          <Button
            size="sm"
            onClick={handleTriggerScrape}
            disabled={isScraping}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-10 px-5 gap-2 shadow-sm"
          >
            <Play className={`w-4 h-4 ${isScraping ? 'animate-spin' : ''}`} />
            <span>{isScraping ? 'Scraping in Progress...' : 'Scrape Live Now'}</span>
          </Button>
        </div>
      </div>

      {/* Balanced Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Next Sync Countdown */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Next Automated Query
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {formatCountdown(secondsRemaining)}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                (5m cycle)
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 2: Engine Status */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isScraping
                ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            <RotateCw className={`w-6 h-6 ${isScraping ? 'animate-spin' : ''}`} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Scraper Engine Status
            </span>
            <span
              className={`text-2xl font-black tracking-tight ${
                isScraping ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {isScraping ? 'Active' : 'Idle'}
            </span>
          </div>
        </Card>

        {/* Metric 3: Active Tracked Portals */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Tracked Portals
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {statusData?.activeSitesCount || 7}
              </span>
              <span className="text-xs font-medium text-muted-foreground">
                in links.txt
              </span>
            </div>
          </div>
        </Card>

        {/* Metric 4: Total Jobs in Database */}
        <Card className="p-5 rounded-2xl bg-card border-border shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
              Jobs Stored in DB
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono tracking-tight text-foreground">
                {statusData?.totalScrapedAllTime || 128}
              </span>
              <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400">
                5-Day TTL
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Tracked Portals (Left) + Live Activity Log Terminal (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Tracked Career Portals */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="p-6 rounded-2xl bg-card border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Tracked Career Portals ({statusData?.activeSites.length || 7})
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-semibold text-muted-foreground">
                curl_cffi chrome120
              </Badge>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Every 5 minutes, our crawler queries each portal with TLS fingerprint spoofing, pulls newly posted openings, and synchronizes them into SQLite.
            </p>

            <div className="space-y-2.5">
              {(statusData?.activeSites || []).map((site: ActiveSiteStatus, idx: number) => {
                const logoPath = `/logos/${site.company.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-secondary/30 border border-border/70 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: Logo & Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center p-2 shrink-0 shadow-xs">
                        <img
                          src={logoPath}
                          alt={site.company}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="font-bold text-emerald-600 text-sm">${site.company.charAt(0)}</span>`;
                          }}
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {site.company}
                          </h4>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 shrink-0">
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
                          <span className="truncate max-w-[200px] sm:max-w-xs">{site.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    {/* Right: Metrics */}
                    <div className="shrink-0 flex items-center sm:flex-col sm:items-end justify-between gap-1 text-xs text-muted-foreground font-mono">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground">
                        <Database className="w-3.5 h-3.5 text-violet-500" />
                        <span>{site.totalInDb} in DB</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {site.lastNewJobs > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            +{site.lastNewJobs} new
                          </span>
                        ) : (
                          <span>0 new (merged)</span>
                        )}
                        <span>•</span>
                        <span>{site.durationMs}ms</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Activity Stream Terminal */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="p-6 rounded-2xl bg-card border-border shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-500" />
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Live Activity Stream
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsLiveStreamActive(!isLiveStreamActive)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                  isLiveStreamActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-secondary text-muted-foreground border-border'
                }`}
              >
                {isLiveStreamActive ? (
                  <Activity className="w-3 h-3 animate-spin" />
                ) : (
                  <Pause className="w-3 h-3" />
                )}
                <span>{isLiveStreamActive ? 'Live Polling' : 'Paused'}</span>
              </button>
            </div>

            {/* Filter by Portal */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={logFilterCompany}
                onChange={(e) => setLogFilterCompany(e.target.value)}
                className="h-8 px-2.5 text-xs font-semibold rounded-lg bg-secondary/60 border border-border text-foreground w-full"
              >
                <option value="all">All Portals & System Events</option>
                <option value="Amazon">Amazon</option>
                <option value="Google">Google</option>
                <option value="Microsoft">Microsoft</option>
                <option value="Meta">Meta</option>
                <option value="Netflix">Netflix</option>
                <option value="Rubrik">Rubrik</option>
                <option value="Uber">Uber</option>
              </select>
            </div>

            {/* Terminal Console */}
            <div className="rounded-xl bg-zinc-950 p-3.5 border border-zinc-800 text-zinc-300 font-mono text-xs h-[460px] overflow-y-auto space-y-2 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 text-zinc-500 text-[11px]">
                <span>HIREME_SCRAPER_DAEMON // PORTAL SYNC</span>
                <span className="text-emerald-400">● CONNECTED</span>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 italic">
                  No activity entries found for this filter.
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
                      className="leading-relaxed hover:bg-zinc-900/60 p-1 rounded transition-colors text-xs flex items-baseline gap-1.5"
                    >
                      <span className="text-zinc-500 shrink-0">[{timeStr}]</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[10px] uppercase shrink-0 ${
                          isSuccess
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : isSync
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                            : isWarn
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {log.level}
                      </span>
                      {log.company && (
                        <span className="text-violet-400 font-bold shrink-0">
                          @{log.company}:
                        </span>
                      )}
                      <span
                        className={`break-words ${
                          isSuccess ? 'text-zinc-100 font-medium' : 'text-zinc-300'
                        }`}
                      >
                        {log.message}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={terminalEndRef} />
            </div>
          </Card>
        </div>
      </div>

      {/* Add Career Portal Link Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      Add Career Portal to Pipeline
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Register recognized or new career links into HireMe scrapers
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
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    Career Page / Search URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://careers.company.com/search or https://company.jobs"
                    value={newCareerUrl}
                    onChange={(e) => setNewCareerUrl(e.target.value)}
                    className="w-full h-10 px-3 text-xs sm:text-sm font-medium rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-emerald-500 text-foreground font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Matching portals activate immediately into <code>links.txt</code>. Unrecognized links queue into <code>new_links.txt</code> for LLM scraper adapter configuration.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAddingLink}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 h-9 rounded-xl"
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
