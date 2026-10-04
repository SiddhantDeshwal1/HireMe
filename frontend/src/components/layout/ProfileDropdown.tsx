'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  SlidersHorizontal,
  Bookmark,
  LogOut,
  Sparkles,
  ShieldCheck,
  Check,
  DollarSign,
  Coins,
  FileText,
  Activity,
} from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { Currency } from '@/types/job';
import { fetchAdminScraperStatus } from '@/lib/api';
import { toast } from 'sonner';

export function ProfileDropdown() {
  const router = useRouter();
  const { profile, currentUser, currency, setCurrency, logout } = usePreferences();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [newJobsCount, setNewJobsCount] = useState<number>(0);

  const displayName = currentUser?.name || profile.name || 'User';
  const displayEmail = currentUser?.email || profile.email || 'user@hireme.dev';
  const initial = displayName.charAt(0).toUpperCase();
  const isAdmin = currentUser?.role === 'admin';
  const savedCount = profile.savedJobIds.length;

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    fetchAdminScraperStatus().then((s) => {
      if (isMounted && s.lastCycleNewJobs) {
        setNewJobsCount(s.lastCycleNewJobs);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [isAdmin, isOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCurrencyChange = (curr: Currency) => {
    setCurrency(curr);
    toast.success(`Currency switched to ${curr === 'USD' ? 'USD ($)' : 'INR (₹)'}`);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    toast.info('Signed out. See you soon!');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Circle Profile Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-11 h-11 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 p-[2px] shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
        aria-label="User Profile Menu"
      >
        <div className="w-full h-full rounded-full bg-card flex items-center justify-center font-black text-foreground text-base hover:bg-card/80 transition-colors">
          {initial}
        </div>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-3 w-80 rounded-3xl bg-card border border-border shadow-2xl p-2.5 z-50 overflow-hidden"
          >
            {/* User Header */}
            <div className="p-3.5 border-b border-border/60 mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center font-black text-violet-600 dark:text-violet-400 text-lg shadow-xs">
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-foreground truncate">
                      {displayName}
                    </span>
                    {isAdmin && (
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate block font-medium">
                    {displayEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Currency Selector (Requirement 11) */}
            <div className="p-3 bg-secondary/50 rounded-2xl mb-2 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-violet-500" />
                  Salary Currency
                </span>
                <span className="text-xs uppercase font-mono font-extrabold text-violet-600 dark:text-violet-400">
                  {currency}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('USD')}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    currency === 'USD'
                      ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                      : 'bg-card text-muted-foreground border-border/70 hover:text-foreground'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>USD ($)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencyChange('INR')}
                  className={`py-2 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all border ${
                    currency === 'INR'
                      ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                      : 'bg-card text-muted-foreground border-border/70 hover:text-foreground'
                  }`}
                >
                  <span>₹ INR</span>
                </button>
              </div>
            </div>

            {/* Navigation & Actions (Requirement 5: Profile Dashboard) */}
            <div className="space-y-1">
              {/* Profile Dashboard Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/profile');
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-sm font-bold text-foreground hover:bg-violet-500/10 hover:text-violet-600 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-violet-500" />
                  Profile Dashboard
                </span>
                <span className="text-xs text-muted-foreground font-semibold">
                  Details & Resume
                </span>
              </button>

              {/* Saved Roles Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/saved');
                }}
                className="w-full flex items-center justify-between p-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-violet-500" />
                  Saved Roles
                </span>
                {savedCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-600 text-white">
                    {savedCount}
                  </span>
                )}
              </button>

              {/* Admin Scraper Monitor Option (Requirement 1: Next to Saved Roles) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/admin');
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-2xl text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>⚡ Scraper Monitor</span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    {newJobsCount > 0 ? `+${newJobsCount} New` : 'Live'}
                  </span>
                </button>
              )}

              {/* Onboarding Survey Option */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push('/onboarding');
                }}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 text-violet-500" />
                <span>Onboarding Survey</span>
              </button>
            </div>

            {/* Footer / Sign Out */}
            <div className="pt-2 mt-1 border-t border-border/60">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 p-3 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch User / Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
