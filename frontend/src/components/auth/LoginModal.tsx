'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Sparkles, ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function LoginModal() {
  const router = useRouter();
  const { isAuthModalOpen, closeAuthModal, login } = usePreferences();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter both username and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error('Invalid credentials.');
      }

      const body = await res.json();
      login(body.user);

      if (body.user.onboardingCompleted) {
        toast.success(`Welcome back, ${body.user.name}!`);
        router.push('/dashboard');
      } else {
        toast.info(`Welcome, ${body.user.name}! Let's set up your career preferences.`);
        router.push('/onboarding');
      }
    } catch {
      // Local fallback for offline mode
      if (username.trim().toLowerCase() === 'admin' && password.trim() === 'admin') {
        const sudoUser = {
          id: 'usr_sudo_admin',
          username: 'admin',
          name: 'Admin (Sudo)',
          email: 'admin@hireme.dev',
          role: 'admin' as const,
          onboardingCompleted: true,
        };
        login(sudoUser);
        toast.success('Sudo authentication successful. Welcome back, Admin!');
        router.push('/dashboard');
      } else {
        const newUser = {
          id: `usr_${username.trim().toLowerCase()}`,
          username: username.trim(),
          name: username.trim(),
          email: `${username.trim()}@example.dev`,
          role: 'user' as const,
          onboardingCompleted: false,
        };
        login(newUser);
        toast.info('Account created! Please complete onboarding.');
        router.push('/onboarding');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillSudoAdmin = () => {
    setUsername('admin');
    setPassword('admin');
    toast.info('Sudo credentials filled! Click Sign In.');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-card border border-border rounded-3xl p-7 shadow-2xl relative overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400" />

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-foreground tracking-tight">
                Welcome to HireMe
              </h2>
              <p className="text-xs text-muted-foreground">
                Sign in to access scrape-verified job openings
              </p>
            </div>
          </div>

          {/* Sudo Fast-Login Banner */}
          <div
            onClick={fillSudoAdmin}
            className="mb-5 p-3 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-center justify-between cursor-pointer hover:bg-violet-500/15 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <KeyRound className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <div className="text-left">
                <span className="text-xs font-bold text-foreground block">
                  Quick Sudo Admin Login
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  admin / admin (Skips onboarding)
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-500/20 px-2 py-1 rounded-lg">
              Auto-fill
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Username / ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="e.g. admin or your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-background border border-border focus:ring-2 focus:ring-violet-500 focus:outline-none text-foreground"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-background border border-border focus:ring-2 focus:ring-violet-500 focus:outline-none text-foreground"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 text-sm font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-violet-600/20 gap-2 mt-2"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          <p className="text-[11px] text-center text-muted-foreground mt-5">
            New user? Simply enter your desired username to begin the onboarding survey.
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
