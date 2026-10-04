'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { AuthUser, Currency, UserPreferences, UserProfile } from '@/types/job';

export const DEFAULT_PREFERENCES: UserPreferences = {
  targetRoles: ['Frontend Engineer', 'Full Stack Developer', 'Software Engineer'],
  experienceLevels: ['senior', 'mid'],
  workSetups: ['remote', 'hybrid'],
  jobTypes: ['full-time'],
  preferredLocations: ['Worldwide', 'United States', 'India'],
  minSalary: 120000,
  currency: 'USD',
  primaryTechStack: ['TypeScript', 'React', 'Next.js', 'Python', 'Go'],
  remoteOnly: false,
  maxPostingAgeDays: 14,
  strictMatching: false,
};

const INITIAL_PROFILE: UserProfile = {
  id: 'usr_default_hireme',
  email: 'admin@hireme.dev',
  name: 'Admin User',
  avatarUrl: null,
  onboardingCompleted: true,
  preferences: DEFAULT_PREFERENCES,
  savedJobIds: [],
  reportedJobIds: [],
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const STORAGE_KEY = 'hireme_user_profile_v2';
const AUTH_KEY = 'hireme_auth_user_v2';

let cachedProfile: UserProfile = INITIAL_PROFILE;
let hasLoadedFromStorage = false;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getStoredProfileSnapshot(): UserProfile {
  if (typeof window === 'undefined') {
    return INITIAL_PROFILE;
  }
  if (!hasLoadedFromStorage) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        cachedProfile = {
          ...INITIAL_PROFILE,
          ...parsed,
          preferences: {
            ...INITIAL_PROFILE.preferences,
            ...(parsed.preferences || {}),
          },
        };
      }
    } catch (e) {
      console.error('Failed to load profile from localStorage', e);
    }
    hasLoadedFromStorage = true;
  }
  return cachedProfile;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

interface PreferencesContextType {
  profile: UserProfile;
  currentUser: AuthUser | null;
  currency: Currency;
  isAuthModalOpen: boolean;
  isHydrated: boolean;
  setCurrency: (c: Currency) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (user: AuthUser) => void;
  logout: () => void;
  updatePreferences: (newPrefs: Partial<UserPreferences>) => void;
  completeOnboarding: (prefs: UserPreferences) => void;
  toggleSaveJob: (jobId: string) => boolean;
  isJobSaved: (jobId: string) => boolean;
  reportJobDead: (jobId: string, reason: string, notes?: string) => Promise<boolean>;
  isJobReported: (jobId: string) => boolean;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const profile = useSyncExternalStore(
    subscribe,
    getStoredProfileSnapshot,
    () => INITIAL_PROFILE
  );

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(AUTH_KEY);
      if (storedAuth) {
        setCurrentUser(JSON.parse(storedAuth));
      } else {
        // Trigger login popup on startup for unauthenticated visitors
        setIsAuthModalOpen(true);
      }
    } catch {
      setIsAuthModalOpen(true);
    }
    setIsHydrated(true);
  }, []);

  const saveToStorage = (updated: UserProfile) => {
    cachedProfile = updated;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist profile', e);
    }
    emitChange();
  };

  const login = (user: AuthUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to persist auth', e);
    }
    setIsAuthModalOpen(false);

    // Sync profile name and email with authenticated user
    const updated = {
      ...cachedProfile,
      name: user.name,
      email: user.email,
      onboardingCompleted: user.onboardingCompleted,
    };
    saveToStorage(updated);
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch (e) {
      console.error('Failed to clear auth', e);
    }
    setIsAuthModalOpen(true);
  };

  const setCurrency = (c: Currency) => {
    updatePreferences({ currency: c });
  };

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated: UserProfile = {
      ...cachedProfile,
      preferences: {
        ...cachedProfile.preferences,
        ...newPrefs,
      },
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(updated);
  };

  const completeOnboarding = (prefs: UserPreferences) => {
    const updated: UserProfile = {
      ...cachedProfile,
      onboardingCompleted: true,
      preferences: prefs,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(updated);
    if (currentUser) {
      const updatedUser = { ...currentUser, onboardingCompleted: true };
      setCurrentUser(updatedUser);
      localStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
    }
  };

  const toggleSaveJob = (jobId: string): boolean => {
    const alreadySaved = cachedProfile.savedJobIds.includes(jobId);
    const newSaved = alreadySaved
      ? cachedProfile.savedJobIds.filter((id) => id !== jobId)
      : [...cachedProfile.savedJobIds, jobId];

    const updated: UserProfile = {
      ...cachedProfile,
      savedJobIds: newSaved,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(updated);
    return !alreadySaved;
  };

  const isJobSaved = (jobId: string) => {
    return profile.savedJobIds.includes(jobId);
  };

  const reportJobDead = async (jobId: string): Promise<boolean> => {
    if (cachedProfile.reportedJobIds.includes(jobId)) {
      return true;
    }
    const updated: UserProfile = {
      ...cachedProfile,
      reportedJobIds: [...cachedProfile.reportedJobIds, jobId],
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(updated);
    return true;
  };

  const isJobReported = (jobId: string) => {
    return profile.reportedJobIds.includes(jobId);
  };

  const resetPreferences = () => {
    const resetProfile: UserProfile = {
      ...cachedProfile,
      preferences: DEFAULT_PREFERENCES,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(resetProfile);
  };

  return (
    <PreferencesContext.Provider
      value={{
        profile,
        currentUser,
        currency: profile.preferences.currency || 'USD',
        isAuthModalOpen,
        isHydrated,
        setCurrency,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        login,
        logout,
        updatePreferences,
        completeOnboarding,
        toggleSaveJob,
        isJobSaved,
        reportJobDead,
        isJobReported,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
