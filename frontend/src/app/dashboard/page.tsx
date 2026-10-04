'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Database,
  Building2,
  FileText,
  Flame,
} from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { CompanyOption, JobFilters, JobPosting, PaginationDetails } from '@/types/job';
import { fetchCompanies, fetchJobs, fetchUserProfile } from '@/lib/api';
import { FilterSidebar } from '@/components/dashboard/FilterSidebar';
import { JobCard } from '@/components/dashboard/JobCard';
import { ZeroResultsEmptyState } from '@/components/dashboard/ZeroResultsEmptyState';
import { LoadingFeedSkeleton } from '@/components/dashboard/LoadingFeedSkeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { profile, currency } = usePreferences();

  const [availableCompanies, setAvailableCompanies] = useState<CompanyOption[]>([]);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);

  // Smart filter states with page: 1
  const [filters, setFilters] = useState<JobFilters>(() => ({
    searchQuery: '',
    datePosted: 'all',
    workSetups: profile.preferences.workSetups,
    jobTypes: profile.preferences.jobTypes,
    experienceLevels: profile.preferences.experienceLevels,
    minSalary: profile.preferences.minSalary,
    sortBy: 'relevant',
    page: 1,
    companies: [],
    matchResume: false,
    resumeSkills: [],
  }));

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [pagination, setPagination] = useState<PaginationDetails>({
    page: 1,
    limit: 10,
    totalMatching: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  // Load companies and resume skills on mount
  useEffect(() => {
    let isMounted = true;
    fetchCompanies().then((comps) => {
      if (isMounted) setAvailableCompanies(comps);
    });
    fetchUserProfile('admin').then((u) => {
      if (isMounted && u.resumeSkills && u.resumeSkills.length > 0) {
        setResumeSkills(u.resumeSkills);
        setFilters((prev) => ({ ...prev, resumeSkills: u.resumeSkills }));
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Query jobs strictly from DB when filters change
  useEffect(() => {
    let isCancelled = false;
    async function loadFeed() {
      setIsLoading(true);
      try {
        const response = await fetchJobs(filters, profile.preferences, 10);
        if (!isCancelled) {
          setJobs(response.data);
          setPagination(response.pagination);
        }
      } catch (err) {
        console.error('Error loading jobs from DB:', err);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadFeed();
    return () => {
      isCancelled = true;
    };
  }, [filters, profile.preferences]);

  const handleUpdateFilters = (partial: Partial<JobFilters>) => {
    const resetPage = partial.page === undefined;
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: resetPage ? 1 : partial.page ?? prev.page,
    }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    handleUpdateFilters({ page: newPage });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      datePosted: 'all',
      workSetups: [],
      jobTypes: [],
      experienceLevels: [],
      minSalary: 0,
      sortBy: 'relevant',
      page: 1,
      companies: [],
      matchResume: false,
      resumeSkills,
    });
    toast.info('Filters reset to default');
  };

  const handleSyncOnboarding = () => {
    setFilters({
      searchQuery: '',
      datePosted: 'all',
      workSetups: profile.preferences.workSetups,
      jobTypes: profile.preferences.jobTypes,
      experienceLevels: profile.preferences.experienceLevels,
      minSalary: profile.preferences.minSalary,
      sortBy: 'relevant',
      page: 1,
      companies: [],
      matchResume: false,
      resumeSkills,
    });
    toast.success('Synced filters with your career survey preferences');
  };

  const removeCompanyFilter = (companyName: string) => {
    const updated = (filters.companies || []).filter((c) => c !== companyName);
    handleUpdateFilters({ companies: updated });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
      {/* Top Banner / Feed Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-border/70 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Curated Job Feed
            </h1>
            <Badge variant="outline" className="text-xs sm:text-sm bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30 font-bold px-3 py-1">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-500" />
              Tailored for {profile.name}
            </Badge>
            <Badge variant="secondary" className="text-xs sm:text-sm font-bold gap-1 text-muted-foreground px-3 py-1">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              SQLite Indexed DB
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 font-medium">
            Live tracked roles from Amazon, Google, Microsoft, Meta, Netflix, Uber, and Rubrik.
          </p>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search title, tech stack, company..."
              value={filters.searchQuery}
              onChange={(e) => handleUpdateFilters({ searchQuery: e.target.value })}
              className="w-full h-12 pl-11 pr-10 text-sm sm:text-base rounded-2xl bg-card border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground shadow-sm font-medium"
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => handleUpdateFilters({ searchQuery: '' })}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-3.5 h-12 shrink-0 shadow-sm">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <select
              value={filters.sortBy}
              aria-label="Sort job feed"
              onChange={(e) =>
                handleUpdateFilters({
                  sortBy: e.target.value as JobFilters['sortBy'],
                })
              }
              className="bg-transparent text-sm sm:text-base font-bold text-foreground focus:outline-none cursor-pointer pr-1"
            >
              <option value="relevant">Most Relevant</option>
              <option value="newest">Newest First</option>
              <option value="salary">Highest Salary</option>
            </select>
          </div>

          {/* Mobile Filter Toggle Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="md:hidden text-sm font-bold h-12 px-4 gap-2 border-border rounded-2xl"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
          </Button>
        </div>
      </div>

      {/* Active Filter Chips Row */}
      {(Boolean(filters.matchResume) || (filters.companies && filters.companies.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2 mb-6 p-3 rounded-2xl bg-secondary/40 border border-border/60">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-1">
            Active Filters:
          </span>

          {/* Match Resume Chip */}
          {filters.matchResume && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-600 text-white text-xs sm:text-sm font-bold shadow-xs">
              <Flame className="w-3.5 h-3.5 fill-white text-white" />
              <span>Resume Matched</span>
              <button
                type="button"
                onClick={() => handleUpdateFilters({ matchResume: false })}
                className="hover:opacity-80 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {/* Company Chips */}
          {filters.companies?.map((company) => (
            <span
              key={company}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 text-xs sm:text-sm font-bold shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5 text-violet-500" />
              <span>{company}</span>
              <button
                type="button"
                onClick={() => removeCompanyFilter(company)}
                className="hover:text-violet-900 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column (Sticky Filter Sidebar) */}
        <div
          className={`md:col-span-3 md:sticky md:top-20 z-10 transition-all ${
            isMobileFilterOpen ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
            <FilterSidebar
              filters={filters}
              onChange={handleUpdateFilters}
              onReset={handleResetFilters}
              onSyncPreferences={handleSyncOnboarding}
              duplicatesMergedCount={0}
              availableCompanies={availableCompanies}
            />
          </div>
        </div>

        {/* Right Column: Feed of Job Cards & Pagination */}
        <div className="md:col-span-9 space-y-5">
          {/* Feed Stats Bar */}
          <div className="flex items-center justify-between text-sm sm:text-base text-muted-foreground px-1">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-foreground text-base sm:text-lg font-black">
                {isLoading ? 'Scanning database...' : `${pagination.totalMatching} Verified Roles Available`}
              </span>
              {pagination.totalPages > 1 && (
                <span className="text-xs sm:text-sm text-muted-foreground font-semibold">
                  (Page {pagination.page} of {pagination.totalPages})
                </span>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-xl bg-secondary text-foreground">
                Currency: {currency}
              </span>
            </div>
          </div>

          {/* Feed Content */}
          {isLoading ? (
            <LoadingFeedSkeleton />
          ) : jobs.length === 0 ? (
            <ZeroResultsEmptyState
              filters={filters}
              onReset={handleResetFilters}
              onRelaxSalary={() => handleUpdateFilters({ minSalary: 0 })}
              onClearSearch={() => handleUpdateFilters({ searchQuery: '' })}
            />
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="space-y-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            </AnimatePresence>
          )}

          {/* Pagination Controls */}
          {!isLoading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className="gap-1.5 rounded-2xl border-border font-bold text-xs sm:text-sm h-11 px-5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>

              {/* Page Pill Indicators */}
              <div className="flex items-center gap-2">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => {
                  const isCurrent = p === pagination.page;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={`w-10 h-10 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                          : 'bg-card text-muted-foreground hover:text-foreground border border-border/80 hover:bg-secondary/60'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className="gap-1.5 rounded-2xl border-border font-bold text-xs sm:text-sm h-11 px-5"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
