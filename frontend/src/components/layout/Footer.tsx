'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Zap, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/40 bg-card/40 backdrop-blur-md mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-base tracking-tight">HireMe</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-mono">
                v1.0.0
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
              The high-velocity personalized job aggregator designed to filter out the noise.
              We prioritize direct ATS links, deduplicate cross-platform postings, and shield you
              from dead listings.
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" /> Direct ATS Verified
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <Zap className="w-3.5 h-3.5" /> 60fps Liquid UI
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Application
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Curated Feed <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/onboarding" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Onboarding Survey <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/saved" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Saved Bookmarks <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Preference Settings <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Handoff & Specs
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>backend_requirements.md</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Cursor-based API ready</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
                <span>Client Deduplication</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Dead Link Telemetry</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground">
          <p>© {new Date().getFullYear()} HireMe Inc. Architected with Next.js, Framer Motion & shadcn/ui.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span>
            <span>•</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-foreground transition-colors cursor-pointer">API Contract</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
