'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Building2, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePreferences } from '@/context/PreferencesContext';
import {
  clearPendingApplication,
  getPendingApplication,
  PendingApplicationData,
  recordJobApplication,
} from '@/lib/api';
import { toast } from 'sonner';
import { getCompanyLogo, getCanonicalCompanyName } from '@/lib/companyLogo';

export function AppliedConfirmModal() {
  const { currentUser, profile } = usePreferences();
  const [pending, setPending] = useState<PendingApplicationData | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const checkForPending = () => {
      // Don't interrupt if modal is already open
      if (isOpen) return;
      const data = getPendingApplication();
      if (data) {
        setPending(data);
        setIsOpen(true);
      }
    };

    const handleFocus = () => {
      // Small timeout to allow tab switch/DOM focus to settle
      setTimeout(checkForPending, 400);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setTimeout(checkForPending, 400);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial check on mount
    const timer = setTimeout(checkForPending, 800);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timer);
    };
  }, [isOpen]);

  if (!isOpen || !pending) return null;

  const username = currentUser?.username || 'admin';

  const handleConfirm = async (actuallyApplied: boolean) => {
    setIsSubmitting(true);
    try {
      if (actuallyApplied) {
        await recordJobApplication({
          username,
          jobId: pending.jobId,
          jobTitle: pending.jobTitle,
          companyName: pending.companyName,
          companyLogoUrl: pending.companyLogoUrl,
          applyUrl: pending.applyUrl,
          status: 'applied',
        });
        toast.success('Application Logged!', {
          description: `Marked "${pending.jobTitle}" as applied in your Application History.`,
        });
      } else {
        toast.info('Application not recorded', {
          description: 'You can always track your applications from your History dashboard.',
        });
      }
    } catch (err) {
      console.error('Error logging application response:', err);
    } finally {
      clearPendingApplication();
      setIsOpen(false);
      setPending(null);
      setIsSubmitting(false);
    }
  };

  const compLogo = getCompanyLogo(pending.companyName, undefined, pending.companyLogoUrl);
  const canonicalName = getCanonicalCompanyName(pending.companyName);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500" />

          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center p-2.5 shrink-0 shadow-xs">
              <img
                src={compLogo}
                alt={canonicalName}
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src.endsWith('.png')) {
                    target.src = target.src.replace(/\.png$/, '.svg');
                  } else {
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = `<span class="text-lg font-black text-violet-600">${canonicalName.charAt(0)}</span>`;
                    }
                  }
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-full border border-violet-500/20 mb-1">
                <Sparkles className="w-3 h-3 text-violet-500" />
                Application Tracker
              </span>
              <h3 className="text-xl font-black text-foreground tracking-tight leading-snug">
                Did you actually apply?
              </h3>
            </div>
          </div>

          {/* Details Card */}
          <div className="p-4 rounded-2xl bg-secondary/40 border border-border/70 space-y-2">
            <div className="text-sm sm:text-base font-extrabold text-foreground truncate">
              {pending.jobTitle}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Building2 className="w-3.5 h-3.5 text-violet-500" />
              <span>{pending.companyName}</span>
              <span>•</span>
              <a
                href={pending.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground text-violet-600 dark:text-violet-400 flex items-center gap-1 font-semibold truncate"
              >
                <span>View portal link</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed font-medium">
            Let us know if you submitted your application on the official site so we can organize your application history.
          </p>

          {/* Action Buttons: Yes / No */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => handleConfirm(false)}
              className="rounded-2xl border-border font-bold text-xs sm:text-sm h-12 gap-2 hover:bg-secondary"
            >
              <XCircle className="w-4 h-4 text-muted-foreground" />
              <span>No, Not Yet</span>
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleConfirm(true)}
              className="rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm h-12 gap-2 shadow-md shadow-violet-600/20"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Yes, I Applied</span>
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
