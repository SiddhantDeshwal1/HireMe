'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  RotateCcw,
  Sparkles,
  DollarSign,
  Calendar,
  Briefcase,
  Layers,
  MapPin,
  Building2,
  FileText,
  Search,
} from 'lucide-react';
import { CompanyOption, ExperienceLevel, JobFilters, JobType, WorkSetup } from '@/types/job';
import { fetchCompanies } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface FilterSidebarProps {
  filters: JobFilters;
  onChange: (updated: Partial<JobFilters>) => void;
  onReset: () => void;
  onSyncPreferences: () => void;
  duplicatesMergedCount: number;
  availableCompanies?: CompanyOption[];
}

const DATE_OPTIONS: { id: JobFilters['datePosted']; label: string }[] = [
  { id: 'all', label: 'Any time' },
  { id: '24h', label: 'Past 24 hours' },
  { id: '7d', label: 'Past 7 days' },
  { id: '30d', label: 'Past 30 days' },
];

const WORK_SETUPS: { id: WorkSetup; label: string }[] = [
  { id: 'remote', label: '100% Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'on-site', label: 'On-site' },
];

const JOB_TYPES: { id: JobType; label: string }[] = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
];

const SENIORITIES: { id: ExperienceLevel; label: string }[] = [
  { id: 'entry', label: 'Entry Level' },
  { id: 'mid', label: 'Mid-Level' },
  { id: 'senior', label: 'Senior' },
  { id: 'lead', label: 'Lead / Staff' },
];

export function FilterSidebar({
  filters,
  onChange,
  onReset,
  onSyncPreferences,
  duplicatesMergedCount,
  availableCompanies: initialCompanies,
}: FilterSidebarProps) {
  const [companies, setCompanies] = useState<CompanyOption[]>(initialCompanies || []);
  const [companySearch, setCompanySearch] = useState('');

  // Fetch company counts if not passed in
  useEffect(() => {
    if (initialCompanies && initialCompanies.length > 0) {
      setCompanies(initialCompanies);
      return;
    }
    let isMounted = true;
    fetchCompanies().then((comps) => {
      if (isMounted) setCompanies(comps);
    });
    return () => {
      isMounted = false;
    };
  }, [initialCompanies]);

  const selectedCompanies = filters.companies || [];

  const toggleCompany = (companyName: string) => {
    const exists = selectedCompanies.includes(companyName);
    const updated = exists
      ? selectedCompanies.filter((c) => c !== companyName)
      : [...selectedCompanies, companyName];
    onChange({ companies: updated });
  };

  const toggleWorkSetup = (id: WorkSetup) => {
    const exists = filters.workSetups.includes(id);
    const updated = exists
      ? filters.workSetups.filter((s) => s !== id)
      : [...filters.workSetups, id];
    onChange({ workSetups: updated });
  };

  const toggleJobType = (id: JobType) => {
    const exists = filters.jobTypes.includes(id);
    const updated = exists
      ? filters.jobTypes.filter((t) => t !== id)
      : [...filters.jobTypes, id];
    onChange({ jobTypes: updated });
  };

  const toggleSeniority = (id: ExperienceLevel) => {
    const exists = filters.experienceLevels.includes(id);
    const updated = exists
      ? filters.experienceLevels.filter((e) => e !== id)
      : [...filters.experienceLevels, id];
    onChange({ experienceLevels: updated });
  };

  const toggleResumeMatch = () => {
    onChange({ matchResume: !filters.matchResume });
  };

  const filteredCompanyList = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const formattedSalary = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(filters.minSalary);

  return (
    <aside className="w-full space-y-6">
      {/* Sidebar Header & Sync */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="text-base sm:text-lg font-black tracking-tight text-foreground flex items-center gap-2">
          <span>Smart Filters</span>
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground gap-1.5 h-8 px-2.5 rounded-lg"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </Button>
      </div>

      {/* Requirement 6: Match Based on Resume Toggle */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-violet-600/15 via-indigo-600/10 to-violet-600/10 border border-violet-500/35 space-y-2 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-extrabold text-foreground">
              Match My Resume
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(filters.matchResume)}
              onChange={toggleResumeMatch}
              className="sr-only peer"
            />
            <div className="w-10 h-5 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600"></div>
          </label>
        </div>
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
          {filters.matchResume
            ? '🔥 Prioritizing roles matching your extracted resume skills.'
            : 'Toggle on to re-rank jobs according to skills in your profile resume.'}
        </p>
      </div>

      {/* Sync with Onboarding Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={onSyncPreferences}
        className="w-full p-3 rounded-2xl bg-secondary/80 border border-border text-foreground text-xs sm:text-sm font-bold flex items-center justify-between text-left hover:bg-secondary transition-all shadow-sm"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Sync Onboarding Criteria
        </span>
        <span className="text-xs uppercase font-mono px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-600 dark:text-violet-400 font-bold">
          Sync
        </span>
      </motion.button>

      {/* Deduplication status alert */}
      {duplicatesMergedCount > 0 && (
        <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
          <span>Deduplication Active</span>
          <span className="font-mono font-bold">{duplicatesMergedCount} merged</span>
        </div>
      )}

      {/* Requirement 1: Filter by Company */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4 text-violet-500" />
            Company
          </label>
          {selectedCompanies.length > 0 && (
            <button
              type="button"
              onClick={() => onChange({ companies: [] })}
              className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline"
            >
              Clear ({selectedCompanies.length})
            </button>
          )}
        </div>

        {/* Company Quick Filter Search */}
        {companies.length > 5 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies..."
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-1 focus:ring-violet-500 text-foreground"
            />
          </div>
        )}

        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {filteredCompanyList.map((comp) => {
            const isChecked = selectedCompanies.includes(comp.name);
            const compLogo = `/logos/${comp.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.svg`;
            return (
              <label
                key={comp.name}
                className={`flex items-center justify-between text-sm py-1.5 px-2 rounded-xl cursor-pointer select-none transition-all ${
                  isChecked
                    ? 'bg-violet-500/10 text-violet-900 dark:text-violet-200 font-bold border border-violet-500/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCompany(comp.name)}
                    className="rounded border-border text-violet-600 focus:ring-violet-500 w-4 h-4 accent-violet-600 cursor-pointer shrink-0"
                  />
                  <div className="w-5 h-5 rounded-md bg-white p-0.5 shrink-0 flex items-center justify-center border border-border/40 overflow-hidden shadow-xs">
                    <img
                      src={compLogo}
                      alt={comp.name}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="truncate text-sm">{comp.name}</span>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground shrink-0">
                  {comp.count}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Date Posted */}
      <div className="space-y-3">
        <label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-500" />
          Date Posted
        </label>
        <div className="grid grid-cols-2 gap-2">
          {DATE_OPTIONS.map((opt) => {
            const isSelected = filters.datePosted === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ datePosted: opt.id })}
                className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold text-left transition-all border ${
                  isSelected
                    ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                    : 'bg-card/70 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Work Setup */}
      <div className="space-y-3">
        <label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-violet-500" />
          Work Setup
        </label>
        <div className="space-y-2">
          {WORK_SETUPS.map((setup) => {
            const isChecked = filters.workSetups.includes(setup.id);
            return (
              <label
                key={setup.id}
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleWorkSetup(setup.id)}
                  className="rounded border-border text-violet-600 focus:ring-violet-500 w-4 h-4 accent-violet-600 cursor-pointer"
                />
                <span className={isChecked ? 'text-foreground font-bold text-sm' : 'text-sm font-medium'}>
                  {setup.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Job Type */}
      <div className="space-y-3">
        <label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-violet-500" />
          Job Type
        </label>
        <div className="space-y-2">
          {JOB_TYPES.map((type) => {
            const isChecked = filters.jobTypes.includes(type.id);
            return (
              <label
                key={type.id}
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleJobType(type.id)}
                  className="rounded border-border text-violet-600 focus:ring-violet-500 w-4 h-4 accent-violet-600 cursor-pointer"
                />
                <span className={isChecked ? 'text-foreground font-bold text-sm' : 'text-sm font-medium'}>
                  {type.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Experience Level */}
      <div className="space-y-3">
        <label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-violet-500" />
          Experience Level
        </label>
        <div className="space-y-2">
          {SENIORITIES.map((exp) => {
            const isChecked = filters.experienceLevels.includes(exp.id);
            return (
              <label
                key={exp.id}
                className="flex items-center gap-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer select-none py-1 px-1 rounded-lg hover:bg-secondary/40 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSeniority(exp.id)}
                  className="rounded border-border text-violet-600 focus:ring-violet-500 w-4 h-4 accent-violet-600 cursor-pointer"
                />
                <span className={isChecked ? 'text-foreground font-bold text-sm' : 'text-sm font-medium'}>
                  {exp.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <Separator className="bg-border/60" />

      {/* Salary Minimum */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-500" />
            Salary Minimum
          </label>
          <span className="text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
            {filters.minSalary === 0 ? 'Any' : `${formattedSalary}/yr`}
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="250000"
          step="10000"
          value={filters.minSalary}
          onChange={(e) => onChange({ minSalary: Number(e.target.value) })}
          className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-600"
        />

        <div className="flex justify-between text-xs font-mono font-semibold text-muted-foreground">
          <span>$0</span>
          <span>$120k</span>
          <span>$250k+</span>
        </div>
      </div>
    </aside>
  );
}
