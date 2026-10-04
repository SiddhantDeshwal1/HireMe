'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Bookmark, Compass, CheckCircle2, Activity } from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { Button } from '@/components/ui/button';
import { ProfileDropdown } from '@/components/layout/ProfileDropdown';
import { fetchAdminScraperStatus } from '@/lib/api';

export function Navbar() {
  const pathname = usePathname();
  const { profile, currentUser } = usePreferences();
  const savedCount = profile.savedJobIds.length;
  const isAdmin = currentUser?.role === 'admin';
  const [newJobsCount, setNewJobsCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    fetchAdminScraperStatus().then((s) => {
      if (isMounted && s.lastCycleNewJobs) {
        setNewJobsCount(s.lastCycleNewJobs);
      }
    });
    const interval = setInterval(() => {
      fetchAdminScraperStatus().then((s) => {
        if (isMounted && s.lastCycleNewJobs !== undefined) {
          setNewJobsCount(s.lastCycleNewJobs);
        }
      });
    }, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAdmin]);

  const navLinks = [
    { name: 'Curated Feed', href: '/dashboard', icon: Compass, badge: null },
    { name: 'Saved Roles', href: '/saved', icon: Bookmark, badge: savedCount > 0 ? String(savedCount) : null },
    ...(isAdmin ? [{
      name: 'Scraper Monitor',
      href: '/admin',
      icon: Activity,
      badge: newJobsCount > 0 ? `+${newJobsCount} New` : 'Live',
    }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-nav transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-violet-500/20 shrink-0"
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-foreground">
                HireMe
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                PRO
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">
              Multi-Site Job Intelligence
            </span>
          </div>
        </Link>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-xl border border-border/60">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href} className="relative">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.name}</span>
                  {link.badge !== null && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-xs font-bold leading-tight ${
                        link.badge === 'Live'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-violet-600 text-white'
                      }`}
                    >
                      {link.badge}
                    </span>
                  )}
                </motion.div>
                {isActive && (
                  <motion.div
                    layoutId="navbar-active-pill"
                    className="absolute inset-0 bg-background rounded-lg shadow-sm -z-10 border border-border/80"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA & Circle Profile Dropdown */}
        <div className="flex items-center gap-3">
          <Link href="/onboarding" className="hidden sm:block">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={pathname === '/onboarding' ? 'default' : 'outline'}
                size="sm"
                className="gap-2 text-xs font-semibold border-border/80 shadow-sm h-10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-500" />
                <span>Onboarding Survey</span>
              </Button>
            </motion.div>
          </Link>

          {/* Profile Circle Avatar with Dropdown */}
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
}
