'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Briefcase,
  Calendar,
  Globe,
  Code2,
  Link2,
  UploadCloud,
  FileText,
  Sparkles,
  Save,
  CheckCircle2,
  Plus,
  X,
  SlidersHorizontal,
  ArrowRight,
  ExternalLink,
  Trash2,
  FolderGit2,
  Award,
  Users,
} from 'lucide-react';
import { usePreferences } from '@/context/PreferencesContext';
import { BestProject, UserProfileDashboard } from '@/types/job';
import { fetchUserProfile, updateUserProfile, uploadResumeFile, parseResumeText } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ProfileDashboardPage() {
  const router = useRouter();
  const { currentUser } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Project modal / inline form state
  const [showAddProject, setShowAddProject] = useState(false);
  const [projTitle, setProjTitle] = useState('');
  const [projSkills, setProjSkills] = useState('');
  const [projLink, setProjLink] = useState('');
  const [projDesc, setProjDesc] = useState('');

  const [profile, setProfile] = useState<UserProfileDashboard>({
    id: 'usr_admin',
    username: currentUser?.username || 'admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@hireme.dev',
    phone: '+1 (555) 019-2834',
    location: 'San Francisco, CA',
    citizenship: 'United States',
    workAuthorization: 'Authorized to work for any employer',
    currentTitle: 'Senior Full Stack Engineer',
    yearsOfExperience: 6,
    linkedinUrl: 'https://linkedin.com/in/hireme-admin',
    githubUrl: 'https://github.com/hireme-admin',
    portfolioUrl: 'https://hireme.dev',
    leetcodeUrl: 'https://leetcode.com/u/hireme-admin',
    codeforcesUrl: 'https://codeforces.com/profile/hireme-admin',
    bestProjects: [
      {
        title: 'Distributed Job Pipeline Engine',
        skills: ['Python', 'FastAPI', 'SQLite', 'Redis', 'Docker'],
        link: 'https://github.com/hireme-admin/pipeline',
        description: 'Async multi-portal aggregator processing 10k+ postings with sub-second querying and resume relevance ranking.',
      },
      {
        title: 'Cloud Native Telemetry Mesh',
        skills: ['Go', 'Kubernetes', 'gRPC', 'Prometheus'],
        link: 'https://github.com/hireme-admin/telemetry-mesh',
        description: 'Zero-overhead observability daemon capturing network traces and TLS handshake diagnostics.',
      },
    ],
    visaSponsorship: 'No',
    militaryVeteranStatus: 'I am not a protected veteran',
    governmentEmployee: 'No',
    gender: 'Prefer not to say',
    raceEthnicity: 'Decline to self-identify',
    disabilityStatus: 'No, I do not have a disability',
    resumeFileName: 'Alex_Rivera_Resume.pdf',
    resumeText: '',
    resumeSkills: [
      'Python',
      'Go',
      'TypeScript',
      'React',
      'AWS',
      'Distributed Systems',
      'Kubernetes',
      'PostgreSQL',
      'Docker',
      'Next.js',
    ],
  });

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchUserProfile(currentUser?.username || 'admin');
        if (isMounted) setProfile(data);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleFieldChange = (field: keyof UserProfileDashboard, val: any) => {
    setProfile((prev) => ({ ...prev, [field]: val }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const updated = await updateUserProfile(profile, profile.username);
      setProfile(updated);
      toast.success('Profile updated successfully!', {
        description: 'Your details, online portfolios, projects, and ATS questionnaire have been saved.',
      });
    } catch (err) {
      toast.error('Failed to save profile changes.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [resumeMode, setResumeMode] = useState<'upload' | 'paste'>('upload');
  const [pastedResumeText, setPastedResumeText] = useState('');
  const [isParsingText, setIsParsingText] = useState(false);

  const processResumeFile = async (file: File) => {
    setIsUploading(true);
    const toastId = toast.loading(`Uploading and parsing ${file.name} with PyPDF...`);
    try {
      const res = await uploadResumeFile(file, profile.username);
      if (res.success && res.profile) {
        setProfile(res.profile);
        toast.success(
          `Resume parsed! Found ${res.extractedSkills.length} skills & inferred ${res.inferredSeniority.toUpperCase()} seniority.`,
          { id: toastId }
        );
      }
    } catch (err) {
      toast.error('Resume upload failed.', { id: toastId });
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
      const res = await parseResumeText(pastedResumeText.trim(), 'pasted_resume.txt', profile.username);
      if (res.success && res.profile) {
        setProfile(res.profile);
        toast.success(
          `Extracted ${res.extractedSkills.length} skills & inferred ${res.inferredSeniority.toUpperCase()} seniority!`,
          { id: toastId }
        );
      }
    } catch (err) {
      toast.error('Failed to parse resume text.', { id: toastId });
      console.error(err);
    } finally {
      setIsParsingText(false);
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (!profile.resumeSkills.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        resumeSkills: [...prev.resumeSkills, trimmed],
      }));
    }
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      resumeSkills: prev.resumeSkills.filter((s) => s !== skillToRemove),
    }));
  };

  const handleCreateProject = () => {
    if (!projTitle.trim()) {
      toast.error('Please specify a project title.');
      return;
    }
    const newProj: BestProject = {
      title: projTitle.trim(),
      skills: projSkills.split(',').map((s) => s.trim()).filter(Boolean),
      link: projLink.trim(),
      description: projDesc.trim(),
    };
    const updated = [...(profile.bestProjects || []), newProj];
    handleFieldChange('bestProjects', updated);
    setProjTitle('');
    setProjSkills('');
    setProjLink('');
    setProjDesc('');
    setShowAddProject(false);
    toast.success(`Added project "${newProj.title}" to featured portfolio!`);
  };

  const handleDeleteProject = (idx: number) => {
    const updated = (profile.bestProjects || []).filter((_, i) => i !== idx);
    handleFieldChange('bestProjects', updated);
    toast.info('Project removed from featured portfolio.');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border/70 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 p-[2px] shadow-md shrink-0">
            <div className="w-full h-full rounded-3xl bg-card flex items-center justify-center font-black text-foreground text-2xl">
              {(profile.firstName || 'U').charAt(0)}
            </div>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {profile.firstName} {profile.lastName}
              </h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active Jobseeker
              </Badge>
            </div>
            <p className="text-sm font-semibold text-muted-foreground mt-1">
              {profile.currentTitle || 'Software Engineer'} • {profile.location}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/onboarding')}
            className="rounded-2xl border-border font-bold text-xs sm:text-sm h-11 px-4 gap-2"
          >
            <SlidersHorizontal className="w-4 h-4 text-violet-500" />
            <span>Retake Survey</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm h-11 px-5 gap-2 shadow-sm shadow-violet-500/20"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Personal, Application & Contact Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Personal & Contact Information */}
          <Card className="p-6 sm:p-7 rounded-3xl bg-card border-border shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
              <User className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">First Name</label>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">Last Name</label>
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  Location (City, State / Country)
                </label>
                <input
                  type="text"
                  value={profile.location}
                  onChange={(e) => handleFieldChange('location', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>
            </div>
          </Card>

          {/* Card 2: Online Portfolios & Competitive Programming (Requirement 5) */}
          <Card className="p-6 sm:p-7 rounded-3xl bg-card border-border shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
              <Globe className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-bold text-foreground">Online Profiles & Competitive Coding</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-blue-500" />
                  LinkedIn Profile
                </label>
                <input
                  type="url"
                  value={profile.linkedinUrl || ''}
                  onChange={(e) => handleFieldChange('linkedinUrl', e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-violet-500" />
                  GitHub Profile
                </label>
                <input
                  type="url"
                  value={profile.githubUrl || ''}
                  onChange={(e) => handleFieldChange('githubUrl', e.target.value)}
                  placeholder="https://github.com/username"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  Portfolio Website
                </label>
                <input
                  type="url"
                  value={profile.portfolioUrl || ''}
                  onChange={(e) => handleFieldChange('portfolioUrl', e.target.value)}
                  placeholder="https://yourportfolio.dev"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  LeetCode Profile
                </label>
                <input
                  type="url"
                  value={profile.leetcodeUrl || ''}
                  onChange={(e) => handleFieldChange('leetcodeUrl', e.target.value)}
                  placeholder="https://leetcode.com/u/handle"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                  <Award className="w-4 h-4 text-rose-500" />
                  Codeforces Profile
                </label>
                <input
                  type="url"
                  value={profile.codeforcesUrl || ''}
                  onChange={(e) => handleFieldChange('codeforcesUrl', e.target.value)}
                  placeholder="https://codeforces.com/profile/handle"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>
            </div>
          </Card>

          {/* Card 3: Featured Best Projects (Requirement 5) */}
          <Card className="p-6 sm:p-7 rounded-3xl bg-card border-border shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <FolderGit2 className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-bold text-foreground">Featured Best Projects</h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddProject(!showAddProject)}
                className="text-xs font-bold gap-1 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddProject ? 'Close' : 'Add Project'}</span>
              </Button>
            </div>

            {/* Add Project Form Drawer */}
            {showAddProject && (
              <div className="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3">
                <h4 className="text-xs font-bold text-foreground uppercase font-mono">
                  New Featured Project
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Project Title (e.g. Distributed Task Queue)"
                    value={projTitle}
                    onChange={(e) => setProjTitle(e.target.value)}
                    className="h-10 px-3 text-xs sm:text-sm rounded-xl bg-card border border-border text-foreground"
                  />
                  <input
                    type="url"
                    placeholder="Project / Demo Link (GitHub, Vercel)"
                    value={projLink}
                    onChange={(e) => setProjLink(e.target.value)}
                    className="h-10 px-3 text-xs sm:text-sm rounded-xl bg-card border border-border text-foreground"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Tech Stack (comma-separated: Python, Redis, Docker)"
                  value={projSkills}
                  onChange={(e) => setProjSkills(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm rounded-xl bg-card border border-border text-foreground"
                />
                <textarea
                  placeholder="Short description of technical architecture and impact..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  rows={2}
                  className="w-full p-3 text-xs sm:text-sm rounded-xl bg-card border border-border text-foreground resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAddProject(false)}
                    className="text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateProject}
                    className="bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold"
                  >
                    Save Project
                  </Button>
                </div>
              </div>
            )}

            {/* Existing Projects List */}
            <div className="space-y-3">
              {(profile.bestProjects || []).length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground italic">
                  No featured projects added yet. Click &quot;Add Project&quot; above to showcase your best engineering work.
                </p>
              ) : (
                profile.bestProjects?.map((proj, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-secondary/20 border border-border/80 hover:border-violet-500/40 transition-all space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                          {proj.title}
                          {proj.link && (
                            <a
                              href={proj.link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-violet-500"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {proj.description}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteProject(idx)}
                        className="text-muted-foreground hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {proj.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Card 4: ATS Application Compliance & Authorization (Requirement 5) */}
          <Card className="p-6 sm:p-7 rounded-3xl bg-card border-border shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
              <Shield className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-bold text-foreground">ATS Compliance & Work Authorization</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">Primary Citizenship</label>
                <input
                  type="text"
                  value={profile.citizenship || ''}
                  onChange={(e) => handleFieldChange('citizenship', e.target.value)}
                  placeholder="e.g. US Citizen, Indian, Canadian"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">Work Authorization</label>
                <input
                  type="text"
                  value={profile.workAuthorization || ''}
                  onChange={(e) => handleFieldChange('workAuthorization', e.target.value)}
                  placeholder="e.g. Authorized to work for any employer"
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">Visa Sponsorship Requirement</label>
                <select
                  value={profile.visaSponsorship || 'No'}
                  onChange={(e) => handleFieldChange('visaSponsorship', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                >
                  <option value="No">No, I do not require sponsorship</option>
                  <option value="Yes">Yes, I will require sponsorship now or in the future</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">Government Employee History</label>
                <select
                  value={profile.governmentEmployee || 'No'}
                  onChange={(e) => handleFieldChange('governmentEmployee', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                >
                  <option value="No">No, never a government employee</option>
                  <option value="Yes">Yes, currently or previously a public employee</option>
                </select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-foreground">Protected Veteran / Military Service</label>
                <select
                  value={profile.militaryVeteranStatus || 'I am not a protected veteran'}
                  onChange={(e) => handleFieldChange('militaryVeteranStatus', e.target.value)}
                  className="w-full h-11 px-4 text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                >
                  <option value="I am not a protected veteran">I am not a protected veteran</option>
                  <option value="I identify as one or more classifications of protected veteran">I identify as one or more classifications of protected veteran</option>
                  <option value="I do not wish to self-identify">I do not wish to self-identify</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Card 5: Equal Employment Opportunity (EEO) Voluntary Disclosures (Requirement 5) */}
          <Card className="p-6 sm:p-7 rounded-3xl bg-card border-border shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-2 border-b border-border/50">
              <Users className="w-5 h-5 text-violet-500" />
              <h2 className="text-lg font-bold text-foreground">Voluntary EEO Disclosures (ATS Standard)</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              These voluntary disclosures mirror standard career site application forms (Workday, Greenhouse, Lever).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Gender Identity</label>
                <select
                  value={profile.gender || 'Prefer not to say'}
                  onChange={(e) => handleFieldChange('gender', e.target.value)}
                  className="w-full h-11 px-3 text-xs sm:text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary / Gender Diverse</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Race / Ethnicity</label>
                <select
                  value={profile.raceEthnicity || 'Decline to self-identify'}
                  onChange={(e) => handleFieldChange('raceEthnicity', e.target.value)}
                  className="w-full h-11 px-3 text-xs sm:text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                >
                  <option value="Asian">Asian</option>
                  <option value="Black or African American">Black or African American</option>
                  <option value="Hispanic or Latino">Hispanic or Latino</option>
                  <option value="White">White / Caucasian</option>
                  <option value="Two or More Races">Two or More Races</option>
                  <option value="Decline to self-identify">Decline to self-identify</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Disability Status</label>
                <select
                  value={profile.disabilityStatus || 'No, I do not have a disability'}
                  onChange={(e) => handleFieldChange('disabilityStatus', e.target.value)}
                  className="w-full h-11 px-3 text-xs sm:text-sm font-medium rounded-2xl bg-secondary/40 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                >
                  <option value="No, I do not have a disability">No, I do not have a disability</option>
                  <option value="Yes, I have a disability">Yes, I have a disability</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Resume Upload & Extracted Skills */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card: Resume Upload & Skills Parser (Requirements 2, 5, 6, 7) */}
          <Card className="p-6 sm:p-7 rounded-3xl bg-card border-border shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-bold text-foreground">Resume & Match Skills</h2>
              </div>
              <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 font-bold">
                PyPDF Engine
              </Badge>
            </div>

            <p className="text-xs sm:text-sm font-medium text-muted-foreground leading-relaxed">
              Upload your resume (PDF, DOCX, TXT) to automatically identify skills. These skills power the <strong>&quot;Match My Resume&quot;</strong> filter and strong match rankings on the dashboard.
            </p>

            {/* Mode Switcher: File / Drag & Drop vs Paste Text */}
            <div className="flex items-center gap-2 p-1 bg-secondary/60 rounded-2xl border border-border/80">
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
                {/* Input OUTSIDE the label to prevent double-activation event bubbling */}
                <input
                  id="profile-resume-upload-input"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileUpload}
                  onClick={(e) => e.stopPropagation()}
                  className="sr-only"
                />

                <label
                  htmlFor="profile-resume-upload-input"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed ${
                    isDraggingOver
                      ? 'border-violet-500 bg-violet-500/15 scale-[1.01]'
                      : 'border-violet-500/40 hover:border-violet-500 bg-violet-500/5 hover:bg-violet-500/10'
                  } rounded-3xl p-6 text-center cursor-pointer transition-all space-y-3 group block`}
                >
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {isUploading
                        ? 'Parsing Resume...'
                        : isDraggingOver
                        ? 'Drop your resume file here!'
                        : 'Choose File or Drag & Drop'}
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground mt-1">
                      Drag directly from file manager • PDF, DOCX, TXT up to 10MB
                    </p>
                  </div>
                  {profile.resumeFileName && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-bold text-foreground shadow-xs">
                      <FileText className="w-3.5 h-3.5 text-violet-500" />
                      <span>Current: {profile.resumeFileName}</span>
                    </div>
                  )}
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea
                  value={pastedResumeText}
                  onChange={(e) => setPastedResumeText(e.target.value)}
                  placeholder="Paste your resume content, plain text, or markdown here..."
                  rows={6}
                  className="w-full p-3.5 text-xs sm:text-sm font-mono rounded-2xl bg-secondary/30 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground resize-y"
                />
                <Button
                  type="button"
                  onClick={handleParsePastedText}
                  disabled={isParsingText || !pastedResumeText.trim()}
                  className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs h-10 gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isParsingText ? 'Parsing Skills...' : 'Extract Skills from Text'}</span>
                </Button>
              </div>
            )}

            {/* Extracted Skills List */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  Identified Skills ({profile.resumeSkills.length})
                </label>
                <span className="text-xs font-semibold text-muted-foreground">
                  Used for Match Level
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {profile.resumeSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-500/30 text-xs sm:text-sm font-bold shadow-xs"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-violet-400 hover:text-violet-700 dark:hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add Custom Skill Input */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Add custom skill (e.g. C++, Rust)..."
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 h-10 px-3.5 text-xs sm:text-sm rounded-xl bg-secondary/50 border border-border focus:outline-none focus:ring-2 focus:ring-violet-500 text-foreground"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSkill}
                  className="h-10 px-3.5 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-bold text-xs"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Card: Return to Dashboard Callout */}
          <Card className="p-6 rounded-3xl bg-gradient-to-br from-violet-600/10 via-card to-card border-border shadow-sm space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Ready to explore matching jobs?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              Your profile details, projects, and technical skills have been recorded. Return to the dashboard and enable the <strong>&quot;Match My Resume&quot;</strong> switch to inspect your curated feed.
            </p>
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm h-11 gap-2 shadow-sm"
            >
              <span>Go to Job Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
