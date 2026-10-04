'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Filter,
  Layers,
  CheckCircle,
  Building2,
  DollarSign,
  MapPin,
  Clock,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  const [demoSalary, setDemoSalary] = useState(150000);
  const [demoRemoteOnly, setDemoRemoteOnly] = useState(true);

  // Simulated noise reduction computation
  const rawJobsCount = 14850;
  const filteredCount = demoRemoteOnly
    ? Math.max(12, Math.round((280000 - demoSalary) / 9500))
    : Math.max(24, Math.round((280000 - demoSalary) / 5000));
  const noiseCutPercent = ((1 - filteredCount / rawJobsCount) * 100).toFixed(1);

  return (
    <div className="flex flex-col items-center overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-violet-600/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Hero Section */}
      <section className="relative w-full max-w-6xl mx-auto px-4 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center flex flex-col items-center">
        {/* Value pill */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold mb-6 shadow-sm shadow-violet-500/10"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
          <span>The Anti-Spam Job Aggregator</span>
          <span className="w-1 h-1 rounded-full bg-violet-400" />
          <span className="text-violet-400/80">Direct ATS Only</span>
        </motion.div>

        {/* Hero headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl text-foreground leading-[1.08]"
        >
          Stop wading through <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">thousands</span> of ghost jobs.
        </motion.h1>

        {/* Hero subhead */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl leading-relaxed"
        >
          Fill out a strict 60-second onboarding questionnaire. We eliminate 99.8% of irrelevant scraper spam, deduplicate identical postings across job boards, and deliver only verified roles matching your exact terms.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
          className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link href="/onboarding" className="w-full sm:w-auto">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-7 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-semibold text-sm shadow-xl shadow-violet-600/25 gap-2.5 rounded-xl"
              >
                <span>Take Onboarding Questionnaire</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </Link>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-12 px-6 border-border/80 hover:bg-secondary/60 text-sm font-medium rounded-xl gap-2"
              >
                <Compass className="w-4 h-4 text-violet-400" />
                <span>Explore Live Feed</span>
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        {/* Interactive Noise Eliminator Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: 'easeOut' }}
          className="mt-14 w-full max-w-3xl rounded-2xl glass-panel p-6 sm:p-8 shadow-2xl text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-border/60 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <h3 className="text-sm font-semibold tracking-tight text-foreground">
                  Live Noise Reduction Engine
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate how strict frontend preferences shield you from wasted applications
              </p>
            </div>

            <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-lg border border-border/70">
              <span className="text-xs text-muted-foreground">Spam Eliminated:</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {noiseCutPercent}%
              </span>
            </div>
          </div>

          {/* Interactive controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-5 border-b border-border/60">
            <div>
              <div className="flex justify-between items-center text-xs mb-2">
                <span className="text-muted-foreground font-medium">Salary Floor:</span>
                <span className="font-mono font-bold text-violet-400">
                  ${(demoSalary / 1000).toFixed(0)}k/year
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="240000"
                step="10000"
                value={demoSalary}
                onChange={(e) => setDemoSalary(Number(e.target.value))}
                className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-violet-500"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end sm:gap-4">
              <span className="text-xs text-muted-foreground font-medium">Work Arrangement:</span>
              <button
                type="button"
                onClick={() => setDemoRemoteOnly(!demoRemoteOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  demoRemoteOnly
                    ? 'bg-violet-600 text-white border-violet-500 shadow-sm shadow-violet-500/30'
                    : 'bg-secondary text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                {demoRemoteOnly ? '✓ 100% Remote Only' : 'Remote + Hybrid'}
              </button>
            </div>
          </div>

          {/* Result Ticker */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block">
                  Scraped Postings
                </span>
                <span className="text-base font-bold font-mono line-through text-muted-foreground/60">
                  {rawJobsCount.toLocaleString()}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-violet-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-violet-400 block">
                  Verified Matches
                </span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {filteredCount} roles
                </span>
              </div>
            </div>

            <Link href="/onboarding">
              <Button size="sm" variant="secondary" className="text-xs font-semibold hover:bg-violet-600 hover:text-white transition-colors">
                Apply Your Preferences →
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Feature Pillars Section */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16 border-t border-border/40">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Built for Engineers Who Value Their Time
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Most job boards are incentivized to show you as much noise as possible. We are engineered to do the exact opposite.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-card/60 backdrop-blur border-border/60 hover:border-violet-500/40 transition-all rounded-xl group">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Filter className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Strict Onboarding Guardrail</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Define your target roles, tech stack, and salary floor upfront. Postings failing your threshold are de-prioritized before you ever see them.
            </p>
          </Card>

          <Card className="p-6 bg-card/60 backdrop-blur border-border/60 hover:border-violet-500/40 transition-all rounded-xl group">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Cross-Platform Deduplication</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When Stripe or Linear post to LinkedIn, Indeed, and Greenhouse within 48h, we merge them into a single record with direct company ATS links.
            </p>
          </Card>

          <Card className="p-6 bg-card/60 backdrop-blur border-border/60 hover:border-violet-500/40 transition-all rounded-xl group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold mb-2">Dead Link Telemetry</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Found an expired listing or 404? Click &apos;Report Dead Link&apos; inside the details slide-out panel to instantly trigger automated de-indexing.
            </p>
          </Card>
        </div>
      </section>

      {/* Live Sample Card Preview */}
      <section className="w-full max-w-6xl mx-auto px-4 py-16 border-t border-border/40">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
              The Feed Experience
            </span>
            <h2 className="text-2xl font-bold tracking-tight mt-1">
              Zero clutter. High-signal cards.
            </h2>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="text-xs gap-1.5">
              Open Full Dashboard <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {/* Sample Mock Job Card */}
        <div className="p-5 rounded-2xl glass-panel border border-violet-500/30 hover:border-violet-500/60 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-violet-950/60 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 text-lg">
                S
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">Senior Frontend Engineer</h3>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" /> Verified ATS
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/30">
                    Cross-posted (Greenhouse + LinkedIn)
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" /> Stripe
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> Remote (Worldwide)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-mono font-semibold">
                    <DollarSign className="w-3.5 h-3.5" /> $185k - $235k / yr
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 5 hours ago
                  </span>
                </div>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
              <div className="px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-300 font-mono font-bold text-xs border border-violet-500/30">
                98% Match
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                Matches TypeScript + Remote
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="w-full max-w-5xl mx-auto px-4 py-16 my-8 text-center">
        <div className="rounded-3xl glass-panel p-8 sm:p-12 relative overflow-hidden border border-violet-500/30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-cyan-600/10 pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Ready to find your next engineering role?
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
            Take 60 seconds to lock in your salary floor, desired stack, and seniority.
            We will do the rest.
          </p>
          <Link href="/onboarding">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="inline-block">
              <Button size="lg" className="h-12 px-8 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-600/30 text-sm">
                Start Questionnaire Now →
              </Button>
            </motion.div>
          </Link>
        </div>
      </section>
    </div>
  );
}
