'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Layers,
  MapPin,
  DollarSign,
  Code2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  X,
  UploadCloud,
  FileText,
  Loader2,
  Check,
  Flame,
} from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { ExperienceLevel, UserPreferences, WorkSetup } from '@/types/job';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { uploadResumeFile, parseResumeText } from '@/lib/api';

const POPULAR_ROLES = [
  'Frontend Engineer',
  'Full Stack Developer',
  'Senior Software Engineer',
  'Design Engineer',
  'Backend Engineer',
  'AI / ML Engineer',
  'Product Engineer',
  'DevOps / SRE',
];

const EXPERIENCE_OPTIONS: { id: ExperienceLevel; title: string; desc: string }[] = [
  { id: 'entry', title: 'Entry Level (0-2 yrs)', desc: 'Associate, junior roles, new grads' },
  { id: 'mid', title: 'Mid-Level (2-5 yrs)', desc: 'Autonomous execution & feature delivery' },
  { id: 'senior', title: 'Senior (5-8 yrs)', desc: 'System architecture, mentor & guild lead' },
  { id: 'lead', title: 'Lead / Staff (8+ yrs)', desc: 'Strategic direction, cross-team influence' },
];

const WORK_SETUP_OPTIONS: { id: WorkSetup; label: string; desc: string }[] = [
  { id: 'remote', label: '100% Remote', desc: 'Work from home or anywhere worldwide' },
  { id: 'hybrid', label: 'Hybrid', desc: '1-3 days in office per week' },
  { id: 'on-site', label: 'On-Site', desc: 'Traditional co-located office' },
];

const POPULAR_SKILLS = [
  'TypeScript',
  'React',
  'Next.js',
  'Tailwind CSS',
  'Node.js',
  'Python',
  'GraphQL',
  'PostgreSQL',
  'Go',
  'Rust',
  'Docker',
  'AWS',
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, currentUser, completeOnboarding } = usePreferences();

  // Initialize draft with existing user preferences
  const [draft, setDraft] = useState<UserPreferences>(profile.preferences);
  const [step, setStep] = useState(1);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [customSkillInput, setCustomSkillInput] = useState('');

  // Resume Fast-Track state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAnalyzingResume, setIsAnalyzingResume] = useState(false);
  const [uploadedResumeName, setUploadedResumeName] = useState<string | null>(null);
  const [extractedResumeSummary, setExtractedResumeSummary] = useState<{
    skills: string[];
    seniority: string;
    roles: string[];
    years: number;
  } | null>(null);

  const TOTAL_STEPS = 6;
  const progressPercent = (step / TOTAL_STEPS) * 100;

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [resumeMode, setResumeMode] = useState<'upload' | 'paste'>('upload');
  const [pastedResumeText, setPastedResumeText] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);

  const applyResumeAnalysis = (res: any, displayName: string) => {
    setExtractedResumeSummary({
      skills: res.extractedSkills,
      seniority: res.inferredSeniority,
      roles: res.suggestedRoles,
      years: res.experienceYears,
    });

    setDraft((prev) => ({
      ...prev,
      primaryTechStack: Array.from(new Set([...prev.primaryTechStack, ...res.extractedSkills])),
      experienceLevels: res.inferredSeniority
        ? [res.inferredSeniority as ExperienceLevel]
        : prev.experienceLevels,
      targetRoles: res.suggestedRoles && res.suggestedRoles.length > 0
        ? res.suggestedRoles
        : prev.targetRoles,
    }));

    toast.success(`Resume parsed: ${displayName}`, {
      description: `Discovered ${res.extractedSkills.length} skills & inferred ${res.inferredSeniority ? res.inferredSeniority.toUpperCase() : 'MID'} seniority level. Preferences pre-filled!`,
    });
  };

  const processResumeFile = async (file: File) => {
    setIsAnalyzingResume(true);
    setUploadedResumeName(file.name);

    try {
      const res = await uploadResumeFile(file, currentUser?.username || 'admin');
      applyResumeAnalysis(res, file.name);
    } catch (err) {
      console.error(err);
      toast.error('Resume upload error. You can continue configuring preferences manually.');
    } finally {
      setIsAnalyzingResume(false);
    }
  };

  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processResumeFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processResumeFile(file);
    }
  };

  const handleParsePastedText = async () => {
    if (!pastedResumeText.trim()) {
      toast.error('Please paste your resume text first.');
      return;
    }
    setIsParsingText(true);
    const toastId = toast.loading('Extracting skills from pasted resume text...');
    try {
      const res = await parseResumeText(pastedResumeText.trim(), 'pasted_resume.txt', currentUser?.username || 'admin');
      setUploadedResumeName('pasted_resume.txt');
      applyResumeAnalysis(res, 'pasted_resume.txt');
    } catch (err) {
      toast.error('Failed to parse resume text.', { id: toastId });
      console.error(err);
    } finally {
      setIsParsingText(false);
    }
  };

  // Step 2: Roles toggle
  const toggleRole = (role: string) => {
    setDraft((prev) => {
      const exists = prev.targetRoles.includes(role);
      const updated = exists
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role];
      return { ...prev, targetRoles: updated };
    });
  };

  const addCustomRole = () => {
    if (!customRoleInput.trim()) return;
    const role = customRoleInput.trim();
    if (!draft.targetRoles.includes(role)) {
      setDraft((prev) => ({ ...prev, targetRoles: [...prev.targetRoles, role] }));
    }
    setCustomRoleInput('');
  };

  // Step 3: Experience toggle
  const toggleExp = (level: ExperienceLevel) => {
    setDraft((prev) => {
      const exists = prev.experienceLevels.includes(level);
      const updated = exists
        ? prev.experienceLevels.filter((e) => e !== level)
        : [...prev.experienceLevels, level];
      return { ...prev, experienceLevels: updated.length ? updated : [level] };
    });
  };

  // Step 4: Work setup toggle
  const toggleWorkSetup = (setup: WorkSetup) => {
    setDraft((prev) => {
      const exists = prev.workSetups.includes(setup);
      const updated = exists
        ? prev.workSetups.filter((s) => s !== setup)
        : [...prev.workSetups, setup];
      return {
        ...prev,
        workSetups: updated.length ? updated : [setup],
        remoteOnly: updated.length === 1 && updated[0] === 'remote',
      };
    });
  };

  // Step 6: Skill toggle
  const toggleSkill = (skill: string) => {
    setDraft((prev) => {
      const exists = prev.primaryTechStack.includes(skill);
      const updated = exists
        ? prev.primaryTechStack.filter((s) => s !== skill)
        : [...prev.primaryTechStack, skill];
      return { ...prev, primaryTechStack: updated };
    });
  };

  const addCustomSkill = () => {
    if (!customSkillInput.trim()) return;
    const skill = customSkillInput.trim();
    if (!draft.primaryTechStack.includes(skill)) {
      setDraft((prev) => ({
        ...prev,
        primaryTechStack: [...prev.primaryTechStack, skill],
      }));
    }
    setCustomSkillInput('');
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    } else {
      // Finish onboarding
      completeOnboarding(draft);
      toast.success('Preferences locked! Personalizing your feed...', {
        description: 'Applied your salary floor, stack, and remote criteria.',
      });
      router.push('/dashboard');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-3xl mx-auto w-full relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Progress & Header */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 font-mono">
          <span className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            STEP {step} OF {TOTAL_STEPS}
          </span>
          <span className="font-bold">{Math.round(progressPercent)}% COMPLETED</span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-secondary" />
      </div>

      {/* Paginated Question Container (One Question Per Screen) */}
      <div className="w-full relative min-h-[460px] flex flex-col justify-between">
        <AnimatePresence mode="wait">
          {/* STEP 1: RESUME FAST-TRACK (Requirement 3 & 2) */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
                <UploadCloud className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider font-extrabold font-mono">
                  Fast-Track With Resume
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                Upload your resume to pre-fill preferences
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Our parser automatically detects your tech stack, years of experience, and target roles so you don’t have to type them manually.
              </p>

              {!uploadedResumeName && !isAnalyzingResume && (
                <div className="space-y-4">
                  {/* Mode switcher */}
                  <div className="flex items-center gap-2 p-1 bg-secondary/60 rounded-2xl border border-border/80 max-w-sm mx-auto">
                    <button
                      type="button"
                      onClick={() => setResumeMode('upload')}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        resumeMode === 'upload'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      File / Drag & Drop
                    </button>
                    <button
                      type="button"
                      onClick={() => setResumeMode('paste')}
                      className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all ${
                        resumeMode === 'paste'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Paste Resume Text
                    </button>
                  </div>

                  {resumeMode === 'upload' ? (
                    <div>
                      <input
                        id="onboarding-resume-upload-input"
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.docx"
                        onChange={handleResumeFileSelect}
                        onClick={(e) => e.stopPropagation()}
                        className="sr-only"
                      />

                      <label
                        htmlFor="onboarding-resume-upload-input"
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed ${
                          isDraggingOver
                            ? 'border-violet-500 bg-violet-500/15 scale-[1.01]'
                            : 'border-violet-500/40 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10'
                        } transition-all cursor-pointer text-center group flex flex-col items-center justify-center space-y-4 block`}
                      >
                        <div className="w-16 h-16 rounded-2xl bg-violet-600/15 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform shadow-xs">
                          <UploadCloud className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="text-base sm:text-lg font-bold text-foreground">
                            {isDraggingOver ? 'Drop resume here to auto-fill!' : 'Click to choose or drag & drop your resume'}
                          </h4>
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                            Drag directly from file manager • Supports PDF, TXT, DOCX
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-xs px-3 py-1 rounded-full bg-secondary font-mono font-medium text-foreground">
                            ⚡ 1-Click Fast Track
                          </span>
                          <span className="text-xs px-3 py-1 rounded-full bg-secondary font-mono font-medium text-foreground">
                            🛡️ Strict Privacy
                          </span>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 rounded-3xl bg-card border border-border">
                      <textarea
                        value={pastedResumeText}
                        onChange={(e) => setPastedResumeText(e.target.value)}
                        placeholder="Paste your resume content, plain text, or markdown here..."
                        rows={7}
                        className="w-full p-4 text-xs sm:text-sm font-mono rounded-2xl bg-secondary/30 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground resize-y"
                      />
                      <Button
                        type="button"
                        onClick={handleParsePastedText}
                        disabled={isParsingText || !pastedResumeText.trim()}
                        className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm h-11 gap-2 shadow-sm"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>{isParsingText ? 'Analyzing Resume Structure...' : 'Extract Skills & Auto-Fill Preferences'}</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {isAnalyzingResume && (
                <div className="p-10 rounded-3xl border border-border bg-card flex flex-col items-center justify-center space-y-4 text-center">
                  <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                  <div>
                    <h4 className="text-lg font-bold text-foreground">
                      Analyzing resume structure...
                    </h4>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-mono">
                      Extracting languages, frameworks, cloud tools, and timeline
                    </p>
                  </div>
                </div>
              )}

              {extractedResumeSummary && !isAnalyzingResume && (
                <div className="p-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Check className="w-5 h-5 font-black" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground block">
                          {uploadedResumeName}
                        </span>
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                          Successfully Extracted & Synced
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedResumeName(null);
                        setExtractedResumeSummary(null);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-xs font-semibold text-foreground cursor-pointer transition-colors"
                    >
                      Change File / Re-upload
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-2xl bg-card border border-border/70">
                      <span className="text-xs text-muted-foreground uppercase font-mono font-bold block mb-1">
                        Inferred Seniority Level
                      </span>
                      <span className="text-sm font-extrabold capitalize text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        {extractedResumeSummary.seniority} Level ({extractedResumeSummary.years} yrs experience)
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-card border border-border/70">
                      <span className="text-xs text-muted-foreground uppercase font-mono font-bold block mb-1">
                        Discovered Technical Skills
                      </span>
                      <span className="text-sm font-extrabold text-foreground">
                        {extractedResumeSummary.skills.length} Technical Keywords Found
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-xs text-muted-foreground font-semibold block mb-2">
                      Extracted Stack:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {extractedResumeSummary.skills.slice(0, 10).map((s) => (
                        <span
                          key={s}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30"
                        >
                          {s}
                        </span>
                      ))}
                      {extractedResumeSummary.skills.length > 10 && (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary text-muted-foreground">
                          +{extractedResumeSummary.skills.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-auto pt-6 text-center text-xs text-muted-foreground">
                {!uploadedResumeName ? (
                  <span>You can also skip this step and manually configure your preferences.</span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✨ Your subsequent steps have been pre-filled! Click Continue to review or adjust.
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: ROLES */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
                <Briefcase className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider font-semibold font-mono">
                  Target Occupations
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                Which roles match your next career move?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Select one or more titles. We will calibrate fuzzy matching against scraped titles.
              </p>

              {/* Pre-defined Chips */}
              <div className="flex flex-wrap gap-2.5 mb-4">
                {POPULAR_ROLES.map((role) => {
                  const isSelected = draft.targetRoles.includes(role);
                  return (
                    <motion.button
                      key={role}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleRole(role)}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                        isSelected
                          ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/20'
                          : 'bg-secondary/60 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {role}
                    </motion.button>
                  );
                })}
              </div>

              {/* Custom Role Input */}
              <div className="flex items-center gap-2 max-w-md mt-2">
                <input
                  type="text"
                  placeholder="Add custom title (e.g. Staff UI Architect)..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
                  className="flex-1 h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-secondary/80 border border-border/80 focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomRole}
                  className="h-10 px-4 text-xs font-bold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              {/* Selected summary */}
              <div className="mt-4 pt-3 border-t border-border/40 text-xs sm:text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Selected ({draft.targetRoles.length}): </span>
                {draft.targetRoles.join(', ') || 'None selected yet'}
              </div>
            </motion.div>
          )}

          {/* STEP 3: EXPERIENCE */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
                <Layers className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider font-semibold font-mono">
                  Seniority Level
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                What experience level suits you best?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Filter out junior tasks or high-overhead management roles depending on your focus.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EXPERIENCE_OPTIONS.map((exp) => {
                  const isSelected = draft.experienceLevels.includes(exp.id);
                  return (
                    <motion.div
                      key={exp.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => toggleExp(exp.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-violet-950/20 border-violet-500 text-foreground shadow-sm shadow-violet-500/10'
                          : 'bg-card/40 border-border/70 hover:border-border hover:bg-card/70 text-muted-foreground'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-violet-600 dark:text-violet-300' : 'text-foreground'}`}>
                          {exp.title}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-violet-500 bg-violet-600 text-white'
                              : 'border-border'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{exp.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 4: WORKPLACE SETUP */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
                <MapPin className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider font-semibold font-mono">
                  Workplace Setup
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                What is your work environment requirement?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Are you strictly remote-first or open to hybrid office schedules?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {WORK_SETUP_OPTIONS.map((setup) => {
                  const isSelected = draft.workSetups.includes(setup.id);
                  return (
                    <motion.div
                      key={setup.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleWorkSetup(setup.id)}
                      className={`p-4 rounded-2xl border cursor-pointer text-left transition-all ${
                        isSelected
                          ? 'bg-violet-950/20 border-violet-500 shadow-md shadow-violet-500/10'
                          : 'bg-card/40 border-border/70 hover:border-border hover:bg-card/70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-violet-600 dark:text-violet-300' : 'text-foreground'}`}>
                          {setup.label}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-violet-500 bg-violet-600 text-white'
                              : 'border-border'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground">{setup.desc}</p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-8 p-4 rounded-2xl bg-secondary/40 border border-border/60 text-xs sm:text-sm text-muted-foreground flex items-center justify-between">
                <span>Enforce 100% Remote Guardrail:</span>
                <span className={`font-mono font-bold ${draft.remoteOnly ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                  {draft.remoteOnly ? 'ENABLED (Hybrid hidden)' : 'DISABLED (Hybrid included)'}
                </span>
              </div>
            </motion.div>
          )}

          {/* STEP 5: COMPENSATION & CURRENCY */}
          {step === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
                <DollarSign className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider font-semibold font-mono">
                  Compensation Floor
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                What is your minimum acceptable annual salary?
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                We use this to rank postings. Jobs disclosing lower rates will be deprioritized.
              </p>

              {/* Currency Selector (Requirement 11) */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex p-1 bg-secondary rounded-2xl border border-border">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        currency: 'USD',
                        minSalary: prev.currency === 'INR' ? Math.round(prev.minSalary / 85) : prev.minSalary,
                      }))
                    }
                    className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      (draft.currency || 'USD') === 'USD'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        currency: 'INR',
                        minSalary: prev.currency === 'USD' ? prev.minSalary * 85 : prev.minSalary,
                      }))
                    }
                    className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      draft.currency === 'INR'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    INR (₹ Lakhs)
                  </button>
                </div>
              </div>

              <div className="p-6 rounded-3xl glass-panel text-center max-w-xl mx-auto w-full mb-6">
                <span className="text-xs uppercase font-mono tracking-wider text-muted-foreground block mb-1">
                  Target Minimum Base
                </span>
                <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400 block mb-6">
                  {draft.currency === 'INR' ? (
                    `₹${(draft.minSalary / 100000).toFixed(1)} LPA`
                  ) : (
                    new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      maximumFractionDigits: 0,
                    }).format(draft.minSalary)
                  )}
                  <span className="text-sm font-normal text-muted-foreground ml-1.5 font-sans">
                    / year
                  </span>
                </span>

                <input
                  type="range"
                  min={draft.currency === 'INR' ? 500000 : 50000}
                  max={draft.currency === 'INR' ? 15000000 : 350000}
                  step={draft.currency === 'INR' ? 100000 : 5000}
                  value={draft.minSalary}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, minSalary: Number(e.target.value) }))
                  }
                  className="w-full accent-violet-600 h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 6: TECH STACK & TOOLS */}
          {step === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-2.5 mb-2 text-violet-600 dark:text-violet-400">
                <Code2 className="w-5 h-5" />
                <span className="text-xs uppercase tracking-wider font-semibold font-mono">
                  Stack & Tooling
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
                What technologies are in your core skillset?
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Postings containing your stack will receive higher relevance match scores.
              </p>

              {/* Pre-defined Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {POPULAR_SKILLS.map((skill) => {
                  const isSelected = draft.primaryTechStack.includes(skill);
                  return (
                    <motion.button
                      key={skill}
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleSkill(skill)}
                      className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                        isSelected
                          ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-600/20'
                          : 'bg-secondary/60 text-muted-foreground border-border/80 hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {skill}
                    </motion.button>
                  );
                })}
              </div>

              {/* Custom Skill Input */}
              <div className="flex items-center gap-2 max-w-md mt-2 mb-4">
                <input
                  type="text"
                  placeholder="Add custom skill (e.g. PyTorch, Rust, GCP)..."
                  value={customSkillInput}
                  onChange={(e) => setCustomSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                  className="flex-1 h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-secondary/80 border border-border/80 focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomSkill}
                  className="h-10 px-4 text-xs font-bold gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>

              {/* Active Selected Badges */}
              <div className="p-4 rounded-2xl bg-card/60 border border-border/60">
                <span className="text-xs font-bold text-muted-foreground uppercase font-mono block mb-2">
                  Active Stack ({draft.primaryTechStack.length} skills):
                </span>
                <div className="flex flex-wrap gap-2">
                  {draft.primaryTechStack.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-bold bg-violet-500/15 text-violet-600 dark:text-violet-300 border border-violet-500/30"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className="hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Action Buttons */}
        <div className="pt-8 border-t border-border/60 flex items-center justify-between gap-4 mt-auto">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="text-xs sm:text-sm font-semibold gap-1.5 border-border/80 rounded-xl h-10 px-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          ) : (
            <div />
          )}

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-11 px-7 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs sm:text-sm shadow-md shadow-violet-600/25 gap-2 rounded-xl"
            >
              <span>
                {step === 1 && !uploadedResumeName
                  ? 'Skip to Manual Setup'
                  : step === TOTAL_STEPS
                  ? 'Complete & Launch Feed'
                  : 'Continue'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
