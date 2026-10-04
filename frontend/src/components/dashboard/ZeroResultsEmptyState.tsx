'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SearchX, RotateCcw, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JobFilters } from '@/types/job';

interface ZeroResultsProps {
  filters: JobFilters;
  onReset: () => void;
  onRelaxSalary: () => void;
  onClearSearch: () => void;
}

export function ZeroResultsEmptyState({
  filters,
  onReset,
  onRelaxSalary,
  onClearSearch,
}: ZeroResultsProps) {
  const hasSalaryFilter = filters.minSalary > 0;
  const hasSearch = filters.searchQuery.trim().length > 0;
  const hasWorkSetupFilter = filters.workSetups.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-8 sm:p-12 rounded-2xl glass-panel text-center max-w-xl mx-auto my-6 border border-border/70 shadow-lg"
    >
      <div className="w-14 h-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        <SearchX className="w-7 h-7 text-violet-400" />
      </div>

      <h3 className="text-lg font-bold text-foreground mb-1.5">
        No Matching Roles Found
      </h3>

      <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
        Your current combination of smart filters is strictly eliminating all scraped postings.
        Here are suggested adjustments to widen the net:
      </p>

      {/* Recommended suggestions */}
      <div className="space-y-2 max-w-sm mx-auto mb-6 text-left">
        {hasSalaryFilter && (
          <button
            type="button"
            onClick={onRelaxSalary}
            className="w-full p-2.5 rounded-xl bg-card hover:bg-secondary border border-border/80 text-xs flex items-center justify-between transition-colors text-foreground"
          >
            <span>Lower salary minimum below ${(filters.minSalary / 1000).toFixed(0)}k</span>
            <ArrowRight className="w-3.5 h-3.5 text-violet-400" />
          </button>
        )}

        {hasSearch && (
          <button
            type="button"
            onClick={onClearSearch}
            className="w-full p-2.5 rounded-xl bg-card hover:bg-secondary border border-border/80 text-xs flex items-center justify-between transition-colors text-foreground"
          >
            <span>Clear search keyword &quot;{filters.searchQuery}&quot;</span>
            <ArrowRight className="w-3.5 h-3.5 text-violet-400" />
          </button>
        )}

        {hasWorkSetupFilter && (
          <button
            type="button"
            onClick={onReset}
            className="w-full p-2.5 rounded-xl bg-card hover:bg-secondary border border-border/80 text-xs flex items-center justify-between transition-colors text-foreground"
          >
            <span>Include Hybrid & On-site roles</span>
            <ArrowRight className="w-3.5 h-3.5 text-violet-400" />
          </button>
        )}
      </div>

      <Button
        variant="default"
        size="sm"
        onClick={onReset}
        className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold gap-2 rounded-xl shadow-md shadow-violet-600/20"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        <span>Reset All Filters</span>
      </Button>
    </motion.div>
  );
}
