'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Compass, Search, Loader2 } from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { JobPosting } from '@/types/job';
import { fetchJobById } from '@/lib/api';
import { JobCard } from '@/components/dashboard/JobCard';
import { JobDetailsSheet } from '@/components/dashboard/JobDetailsSheet';
import { Button } from '@/components/ui/button';

export default function SavedJobsPage() {
  const { profile } = usePreferences();
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [savedJobs, setSavedJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real job objects for all bookmarked job IDs
  useEffect(() => {
    let isMounted = true;

    async function loadSavedJobs() {
      if (profile.savedJobIds.length === 0) {
        if (isMounted) {
          setSavedJobs([]);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const fetched = await Promise.all(
          profile.savedJobIds.map((id) => fetchJobById(id, profile.preferences))
        );
        if (isMounted) {
          const validJobs = fetched.filter((j): j is JobPosting => j !== null);
          setSavedJobs(validJobs);
        }
      } catch (err) {
        console.error('Failed to load saved roles:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSavedJobs();

    return () => {
      isMounted = false;
    };
  }, [profile.savedJobIds, profile.preferences]);

  // Filter based on search query
  const filteredJobs = savedJobs.filter((job) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(q) ||
      job.company.name.toLowerCase().includes(q) ||
      job.skills.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-border/60 gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Bookmark className="w-5 h-5 fill-current" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Saved Roles
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-secondary text-foreground">
              {profile.savedJobIds.length} bookmarked
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1.5">
            Manage high-priority opportunities and track application statuses.
          </p>
        </div>

        {/* Search within bookmarks */}
        {profile.savedJobIds.length > 0 && (
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter bookmarked roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs sm:text-sm rounded-xl bg-card border border-border/80 focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
            />
          </div>
        )}
      </div>

      {/* Content Area */}
      {profile.savedJobIds.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-12 rounded-3xl glass-panel text-center max-w-lg mx-auto my-12 border border-border/70 shadow-lg space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto text-muted-foreground">
            <Bookmark className="w-7 h-7 text-violet-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">No Saved Roles Yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 leading-relaxed">
              Bookmark roles from your feed to evaluate and compare requirements here.
            </p>
          </div>
          <Link href="/dashboard">
            <Button className="bg-violet-600 hover:bg-violet-500 text-white text-xs sm:text-sm font-bold gap-2 rounded-xl h-11 px-5 shadow-md shadow-violet-600/20">
              <Compass className="w-4 h-4" />
              <span>Browse Curated Feed</span>
            </Button>
          </Link>
        </motion.div>
      ) : isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
          <span className="text-xs sm:text-sm font-semibold">Loading bookmarked roles...</span>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-12 text-center text-xs sm:text-sm font-medium text-muted-foreground bg-secondary/30 rounded-2xl border border-border">
          {searchQuery ? (
            <span>No saved roles match &quot;{searchQuery}&quot;. Try a different keyword.</span>
          ) : (
            <span>None of your saved roles are currently available.</span>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={(selected) => setSelectedJob(selected)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Slide-Out Details Sheet */}
      <JobDetailsSheet
        job={selectedJob}
        isOpen={Boolean(selectedJob)}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
