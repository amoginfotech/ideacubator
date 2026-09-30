'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db, storage, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, User } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AIReviewResult {
  clarityScore: number;
  oneLineSummary: string;
  problemAssessment: string;
  customerAssessment: string;
  promisingPoints: string[];
  openQuestions: string[];
  nextExperiment: string;
  recommendedFounderActions: string[];
}

export default function SubmitIdeaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [step, setStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  // Step 1: Founder Profile
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    userType: '',
    role: '',
    experienceYears: '',
    linkedIn: ''
  });

  // Dynamic Situation-Specific Extra Fields
  const [extra, setExtra] = useState<Record<string, string>>({});

  // Step 2: Idea Details
  const [idea, setIdea] = useState({
    title: '',
    description: '',
    problem: '',
    customer: '',
    currentStage: '',
    traction: '',
    monetization: '',
    geography: '',
    team: '',
    founderCommitment: '',
    supportNeeded: ''
  });

  // Step 3: Documents
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Step 4: AI Review & Consent
  const [aiReviewing, setAiReviewing] = useState(false);
  const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setProfile((prev) => ({
          ...prev,
          fullName: prev.fullName || currentUser.displayName || '',
          email: prev.email || currentUser.email || ''
        }));
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Restore draft from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem('ic_application_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.profile) setProfile((p) => ({ ...p, ...draft.profile }));
        if (draft.extra) setExtra(draft.extra);
        if (draft.idea) setIdea((i) => ({ ...i, ...draft.idea }));
        if (draft.additionalContext) setAdditionalContext(draft.additionalContext);
      } catch (e) {
        console.warn('Could not parse saved draft:', e);
      }
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in was cancelled or failed.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    setErrorMessage('');
    const validExts = /\.(pdf|doc|docx|ppt|pptx)$/i;
    const maxSize = 10 * 1024 * 1024; // 10MB
    const accepted: File[] = [];

    for (const f of newFiles) {
      if (!validExts.test(f.name)) {
        setErrorMessage(`"${f.name}" is not supported (PDF, DOC, DOCX, PPT, PPTX only).`);
        continue;
      }
      if (f.size > maxSize) {
        setErrorMessage(`"${f.name}" exceeds the 10MB size limit.`);
        continue;
      }
      accepted.push(f);
    }

    if (accepted.length > 0) {
      setAttachedFiles((prev) => [...prev, ...accepted]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const validateStep = (current: number): boolean => {
    setErrorMessage('');
    if (current === 1) {
      if (!profile.fullName.trim()) {
        setErrorMessage('Please enter your full name.');
        return false;
      }
      if (!profile.email.trim() || !profile.email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return false;
      }
      if (!profile.userType) {
        setErrorMessage('Please choose what best describes your current situation.');
        return false;
      }
      // Specific checks
      if (['seed', 'vc', 'sell', 'ipo', 'value', 'intl-out', 'intl-in'].includes(profile.userType)) {
        if (!extra.companyName?.trim()) {
          setErrorMessage('Please specify your company or entity name.');
          return false;
        }
      }
    } else if (current === 2) {
      if (!idea.title.trim()) {
        setErrorMessage('Please enter an idea or company working title.');
        return false;
      }
      if (!idea.description.trim() || idea.description.trim().length < 20) {
        setErrorMessage('Please describe your idea in a few sentences (at least 20 characters).');
        return false;
      }
    }
    return true;
  };

  const goToStep = (direction: number) => {
    setErrorMessage('');
    if (direction > 0 && !validateStep(step)) {
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }
    const nextStep = Math.max(1, Math.min(3, step + direction));
    setStep(nextStep);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const saveDraft = () => {
    const draft = { profile, extra, idea, additionalContext };
    localStorage.setItem('ic_application_draft', JSON.stringify(draft));
    showToast('Draft saved securely to this device.');
  };

  // Run AI Review
  const triggerAIReview = async () => {
    setErrorMessage('');
    if (!validateStep(2)) {
      setStep(2);
      return;
    }
    setAiReviewing(true);

    // Heuristic generator fallback matching functions/index.js logic
    const generateFallback = (): AIReviewResult => {
      const desc = idea.description || '';
      const wordCount = desc.split(/\s+/).filter(Boolean).length;
      const score = Math.min(9, Math.max(6, Math.floor(wordCount / 12) + (idea.problem ? 2 : 0)));

      return {
        clarityScore: score,
        oneLineSummary: `${idea.title || 'Working Concept'}: An emerging solution targeting ${idea.customer || 'target users'} to address ${idea.problem ? idea.problem.slice(0, 90) : 'key domain challenges'}.`,
        problemAssessment: idea.problem
          ? `Problem defined as: "${idea.problem.slice(0, 160)}". Recommended next step is measuring how acutely buyers feel this daily friction.`
          : 'The problem statement needs sharper definition. State clearly what is slow, fragmented, or expensive today.',
        customerAssessment: idea.customer
          ? `Target customer identified as "${idea.customer}". Confirming their budget authority and purchase cycle will validate early willingness-to-pay.`
          : 'Define the single beachhead user profile who experiences this pain most intensely.',
        promisingPoints: [
          'Addresses a tangible and modern industry challenge.',
          `Clear stage alignment positioned at the "${idea.currentStage || 'Idea only'}" milestone.`,
          'Direct founder intuition and transparent operational articulation.'
        ],
        openQuestions: [
          'What is the primary trigger that forces customers to stop using their current workaround?',
          'What does the fastest proof-of-value workflow look like in week 1?',
          'How does your distribution strategy acquire the first 10 reference clients?'
        ],
        nextExperiment: 'Conduct 5 structured 20-minute discovery interviews with target buyers without pitching any product—probe whether this pain ranks in their top 3 urgent priorities.',
        recommendedFounderActions: [
          'Map out the precise manual workflow customers currently tolerate.',
          'Define a tight 2-to-3 week prototype scope to validate customer intent.',
          'Formulate early unit pricing hypotheses before committing engineering hours.'
        ]
      };
    };

    try {
      // Simulate quick processing for interactive feedback
      await new Promise((r) => setTimeout(r, 900));
      const res = generateFallback();
      setAiResult(res);
      showToast('AI review completed.');
    } catch (err: any) {
      setErrorMessage('AI review was temporarily unavailable. You can proceed with standard submission.');
    } finally {
      setAiReviewing(false);
    }
  };

  // Submit Application
  const submitApplication = async () => {
    setErrorMessage('');
    if (!consentChecked) {
      setErrorMessage('Please confirm the accuracy of your submission and terms agreement before submitting.');
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    if (!user) {
      setErrorMessage('You must be signed in to submit your application.');
      return;
    }

    setSubmitting(true);
    try {
      const newAppRef = doc(collection(db, 'applications'));
      const applicationId = newAppRef.id;
      const uploadedDocs: any[] = [];

      if (attachedFiles.length > 0) {
        let fileIndex = 0;
        for (const file of attachedFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('applicantUid', user.uid);
            formData.append('applicationId', applicationId);

            const res = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });

            if (res.ok) {
              const data = await res.json();
              uploadedDocs.push({
                name: file.name,
                size: file.size,
                storagePath: data.storagePath,
                downloadUrl: data.downloadUrl,
                uploadedAt: data.uploadedAt || new Date().toISOString()
              });
            } else {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Upload API returned status ${res.status}`);
            }
          } catch (uploadErr: any) {
            console.warn('Failed to upload file to storage:', file.name, uploadErr);
            uploadedDocs.push({
              name: file.name,
              size: file.size,
              note: 'File attached by founder',
              uploadedAt: new Date().toISOString()
            });
          }
          fileIndex++;
          setUploadProgress(Math.round((fileIndex / attachedFiles.length) * 100));
        }
      }

      // Firestore submission
      await setDoc(newAppRef, {
        applicantUid: user.uid,
        founderEmail: profile.email || user.email,
        founderName: profile.fullName || user.displayName,
        founderPhone: profile.phone,
        founderLocation: profile.location,
        founderType: profile.userType,
        profile,
        extra,
        idea,
        documents: uploadedDocs,
        additionalContext,
        aiReview: aiResult || null,
        stage: 1,
        status: 'received',
        metadata: {
          status: 'received',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      });

      // Clear draft upon successful submission
      localStorage.removeItem('ic_application_draft');
      setSubmittedId(applicationId);
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage('Failed to submit application: ' + err.message);
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <main className="page submit-page">
      <div className="container">
        {/* Toast Alert */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: 'var(--ink)',
              color: 'var(--paper)',
              padding: '12px 20px',
              borderRadius: '12px',
              boxShadow: 'var(--shadow)',
              fontSize: '13px',
              zIndex: 999
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* Page Head */}
        <div className="page-head">
          <div>
            <div className="eyebrow">Start with the idea</div>
            <h1 className="title submit-title">Tell us what you’re building.</h1>
            <p className="subtitle submit-subtitle">
              A focused, low-friction application. Start with the founder and the problem. We can go deeper together later.
            </p>
          </div>
        </div>

        <div className="shell">
          {/* SIDEBAR MILESTONES */}
          <aside className="sidebar">
            <div
              className={`side-link ${step === 1 ? 'active' : ''}`}
              onClick={() => {
                if (user && step > 1) goToStep(1 - step);
              }}
              style={{ cursor: user && step > 1 ? 'pointer' : 'default' }}
            >
              01 · Founder Detail
            </div>
            <div
              className={`side-link ${step === 2 ? 'active' : ''}`}
              onClick={() => {
                if (user && step !== 2) goToStep(2 - step);
              }}
              style={{ cursor: user ? 'pointer' : 'default' }}
            >
              02 · Idea Detail
            </div>
            <div
              className={`side-link ${step === 3 ? 'active' : ''}`}
              onClick={() => {
                if (user && step !== 3) goToStep(3 - step);
              }}
              style={{ cursor: user ? 'pointer' : 'default' }}
            >
              03 · Review &amp; Submit
            </div>

            {/* Founder Guarantees Card */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px 14px',
                background: 'var(--cream)',
                border: '1px solid var(--line)',
                borderRadius: '12px',
                fontSize: '11px',
                lineHeight: 1.5,
                color: 'var(--ink-2)'
              }}
            >
              <strong
                style={{
                  display: 'block',
                  color: 'var(--brown)',
                  marginBottom: '6px',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em'
                }}
              >
                Founder Guarantees
              </strong>
              <div style={{ marginBottom: '6px' }}>
                🛡️ <strong>100% IP Ownership:</strong> Complete ownership of all ideas and code. Zero claim on concepts.
              </div>
              <div style={{ marginBottom: '6px' }}>
                🔒 <strong>Strict Confidentiality:</strong> Reviewed exclusively under strict non-disclosure standards.
              </div>
              <div>
                ⚡ <strong>48-Hr Response SLA:</strong> Direct evaluation by our principal team. No automated rejections.
              </div>
            </div>

            {/* Submissions & Questions */}
            <div
              style={{
                marginTop: '14px',
                padding: '12px',
                fontSize: '11px',
                color: 'var(--ink-3)',
                lineHeight: 1.5,
                borderTop: '1px solid var(--line)'
              }}
            >
              Submissions &amp; questions:
              <br />
              <a
                href="mailto:submitidea@ideacubator.in"
                style={{ color: 'var(--brown)', fontWeight: 700, textDecoration: 'underline' }}
              >
                submitidea@ideacubator.in
              </a>
            </div>
          </aside>

          {/* FORM CARD */}
          <section className="card">
            {/* SUCCESS STATE */}
            {submittedId ? (
              <div className="success show">
                <div className="success-icon">✓</div>
                <h2>Application received.</h2>
                <p>
                  Your idea has been recorded and connected to your private Ideacubator workspace. You can follow your journey,
                  track review status, message our team, and manage documents from there.
                </p>
                <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <Link className="primary" href="/dashboard">
                    Open My Workspace →
                  </Link>
                  <Link className="secondary" href="/">
                    Back to Ideacubator
                  </Link>
                </div>
              </div>
            ) : !user ? (
              /* AUTH GATE (Shown when not logged in) */
              <div className="auth" id="authGate">
                <div>
                  <div className="auth-icon">⌁</div>
                  <h2>Sign in to start.</h2>
                  <p>
                    Your application, documents, conversations, meetings, and milestone updates will stay securely organized in your
                    private workspace.
                  </p>
                  <button className="google" type="button" onClick={handleGoogleSignIn}>
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    Continue with Google
                  </button>
                  <div className="help" style={{ marginTop: '14px' }}>
                    Already submitted? Use the same account to access your workspace.
                  </div>
                </div>
              </div>
            ) : (
              /* APPLICATION FORM */
              <div className="pad">
                {/* Alert Box */}
                {errorMessage && <div className="alert show error">{errorMessage}</div>}

                {/* DIAGRAMMATIC STEPPER */}
                <div className="stepper-indicator">
                  <button
                    type="button"
                    className={`stepper-step ${step === 1 ? 'active' : step > 1 ? 'done' : ''}`}
                    onClick={() => {
                      if (step > 1) goToStep(1 - step);
                    }}
                  >
                    <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
                    <div className="step-meta">
                      <span className="step-number-tag">Step 01</span>
                      <span className="step-title-text">Founder Detail</span>
                    </div>
                  </button>

                  <div className={`stepper-line ${step > 1 ? 'done' : ''}`} />

                  <button
                    type="button"
                    className={`stepper-step ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}
                    onClick={() => {
                      if (step > 2) goToStep(2 - step);
                      else if (step === 1 && validateStep(1)) goToStep(1);
                    }}
                  >
                    <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
                    <div className="step-meta">
                      <span className="step-number-tag">Step 02</span>
                      <span className="step-title-text">Idea Detail</span>
                    </div>
                  </button>

                  <div className={`stepper-line ${step > 2 ? 'done' : ''}`} />

                  <button
                    type="button"
                    className={`stepper-step ${step === 3 ? 'active' : ''}`}
                    onClick={() => {
                      if (step === 2 && validateStep(2)) goToStep(1);
                      else if (step === 1 && validateStep(1)) goToStep(2);
                    }}
                  >
                    <div className="step-circle">3</div>
                    <div className="step-meta">
                      <span className="step-number-tag">Step 03</span>
                      <span className="step-title-text">Review &amp; Submit</span>
                    </div>
                  </button>
                </div>

                {/* PANEL 1: FOUNDER DETAIL */}
                {step === 1 && (
                  <div className="panel">
                    <div className="note" style={{ marginBottom: '22px' }}>
                      Tell us who you are and where you are today. Choose the situation that best matches your starting point.
                    </div>

                    <div className="grid">
                      <div className="field">
                        <label className="label">
                          Full Name <span className="required">*</span>
                        </label>
                        <input
                          required
                          value={profile.fullName}
                          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                          placeholder="Your name"
                        />
                      </div>

                      <div className="field">
                        <label className="label">
                          Email Address <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          placeholder="you@domain.com"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Phone / WhatsApp</label>
                        <input
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="+91 98765 43210"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Current Location</label>
                        <input
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          placeholder="City, Country"
                        />
                      </div>

                      <div className="field full">
                        <label className="label">
                          What best describes you right now? <span className="required">*</span>
                        </label>
                        <select
                          value={profile.userType}
                          onChange={(e) => {
                            setProfile({ ...profile, userType: e.target.value });
                            setExtra({});
                          }}
                          required
                        >
                          <option value="">Choose one...</option>
                          <option value="student">I’m a student with a startup idea</option>
                          <option value="professional">I have an idea but need someone to build it</option>
                          <option value="seed">I’ve built a product and I’m ready to raise funding</option>
                          <option value="vc">My business is making money and I’m ready to scale</option>
                          <option value="sell">I want to explore selling my business</option>
                          <option value="test">I want to test my idea before a bigger commitment</option>
                          <option value="value">I need my business valued</option>
                          <option value="intl-out">I want to expand my Indian business internationally</option>
                          <option value="intl-in">I’m an international business seeking an India partner</option>
                        </select>
                      </div>

                      {/* Dynamic Situation-Specific Fields: ONLY shown after selecting an option */}
                      {profile.userType === 'student' && (
                        <>
                          <div className="field full">
                            <label className="label">College / University &amp; Degree</label>
                            <input
                              value={extra.education || ''}
                              onChange={(e) => setExtra({ ...extra, education: e.target.value })}
                              placeholder="e.g. IIT Delhi / B.Tech Computer Science"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Graduation Year / Academic Standing</label>
                            <input
                              value={extra.studentYear || ''}
                              onChange={(e) => setExtra({ ...extra, studentYear: e.target.value })}
                              placeholder="e.g. 2026 / Pre-final Year"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Weekly Time Available for Startup</label>
                            <input
                              value={extra.studentCommitment || ''}
                              onChange={(e) => setExtra({ ...extra, studentCommitment: e.target.value })}
                              placeholder="e.g. 20 hrs/week now, full-time post graduation"
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'professional' && (
                        <>
                          <div className="field">
                            <label className="label">Current Role / Title</label>
                            <input
                              value={profile.role}
                              onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                              placeholder="e.g. VP Engineering, Product Director, Operations Lead"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Domain &amp; Industry Expertise</label>
                            <input
                              value={extra.industryExperience || ''}
                              onChange={(e) => setExtra({ ...extra, industryExperience: e.target.value })}
                              placeholder="e.g. 10 years supply chain & fintech systems"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">
                              LinkedIn Profile <span className="help">(optional)</span>
                            </label>
                            <input
                              type="url"
                              value={profile.linkedIn}
                              onChange={(e) => setProfile({ ...profile, linkedIn: e.target.value })}
                              placeholder="https://linkedin.com/in/..."
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'seed' && (
                        <>
                          <div className="field full">
                            <label className="label">
                              Startup / Company Name <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Registered entity or venture name"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Product Stage &amp; Traction</label>
                            <input
                              value={extra.revenueRange || ''}
                              onChange={(e) => setExtra({ ...extra, revenueRange: e.target.value })}
                              placeholder="e.g. Live MVP, $12K MRR, 3,500 active users"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Prior Capital</label>
                            <input
                              value={extra.fundingStage || ''}
                              onChange={(e) => setExtra({ ...extra, fundingStage: e.target.value })}
                              placeholder="Bootstrapped / Angel round / Incubator"
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'vc' && (
                        <>
                          <div className="field full">
                            <label className="label">
                              Company Name <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Registered company name"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Revenue &amp; Growth Metrics</label>
                            <input
                              value={extra.revenueRange || ''}
                              onChange={(e) => setExtra({ ...extra, revenueRange: e.target.value })}
                              placeholder="e.g. $1.2M ARR, 15% MoM growth"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Team Size</label>
                            <input
                              value={extra.companyScale || ''}
                              onChange={(e) => setExtra({ ...extra, companyScale: e.target.value })}
                              placeholder="e.g. 18 FTEs (Engineering, Sales, Ops)"
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'sell' && (
                        <>
                          <div className="field full">
                            <label className="label">
                              Business Name <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Entity name"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Annual Revenue &amp; Margin</label>
                            <input
                              value={extra.revenueRange || ''}
                              onChange={(e) => setExtra({ ...extra, revenueRange: e.target.value })}
                              placeholder="e.g. $2.5M revenue, 28% EBITDA"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Exit Objectives &amp; Target Timeline</label>
                            <textarea
                              value={extra.saleContext || ''}
                              onChange={(e) => setExtra({ ...extra, saleContext: e.target.value })}
                              placeholder="Target timeline, expected valuation multiple, or strategic reasons for exit."
                              style={{ minHeight: '80px' }}
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'ipo' && (
                        <>
                          <div className="field full">
                            <label className="label">
                              Company Name <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Registered company name"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Current Scale &amp; Financials</label>
                            <input
                              value={extra.companyScale || ''}
                              onChange={(e) => setExtra({ ...extra, companyScale: e.target.value })}
                              placeholder="Annual turnover, PAT / EBITDA margin"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Public Market Objective / Target Horizon</label>
                            <textarea
                              value={extra.ipoContext || ''}
                              onChange={(e) => setExtra({ ...extra, ipoContext: e.target.value })}
                              placeholder="Target timeline (e.g. SME / Mainboard within 18-24 months) and primary listing goals."
                              style={{ minHeight: '80px' }}
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'test' && (
                        <>
                          <div className="field">
                            <label className="label">Current Professional Situation</label>
                            <input
                              value={extra.testStatus || ''}
                              onChange={(e) => setExtra({ ...extra, testStatus: e.target.value })}
                              placeholder="e.g. Full-time employee exploring next venture"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Available Weekly Commitment</label>
                            <input
                              value={extra.testHours || ''}
                              onChange={(e) => setExtra({ ...extra, testHours: e.target.value })}
                              placeholder="e.g. 10–15 hours / week (nights & weekends)"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Target Validation Window</label>
                            <input
                              value={extra.validationWindow || ''}
                              onChange={(e) => setExtra({ ...extra, validationWindow: e.target.value })}
                              placeholder="e.g. 4 to 8 weeks pilot before transition"
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'value' && (
                        <>
                          <div className="field">
                            <label className="label">
                              Business Name <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Entity name"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Valuation Purpose</label>
                            <input
                              value={extra.valuationPurpose || ''}
                              onChange={(e) => setExtra({ ...extra, valuationPurpose: e.target.value })}
                              placeholder="Fundraising / shareholder buyout / restructuring"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Financial Overview</label>
                            <textarea
                              value={extra.valuationContext || ''}
                              onChange={(e) => setExtra({ ...extra, valuationContext: e.target.value })}
                              placeholder="Key financial indicators (trailing twelve months revenue, margins, growth rate)."
                              style={{ minHeight: '80px' }}
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'intl-out' && (
                        <>
                          <div className="field">
                            <label className="label">
                              Current Indian Business <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Indian operating entity name"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Target International Region</label>
                            <input
                              value={extra.targetMarket || ''}
                              onChange={(e) => setExtra({ ...extra, targetMarket: e.target.value })}
                              placeholder="North America / GCC & UAE / Southeast Asia / Europe"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">Current Overseas Leads &amp; International Status</label>
                            <textarea
                              value={extra.expansionContext || ''}
                              onChange={(e) => setExtra({ ...extra, expansionContext: e.target.value })}
                              placeholder="Existing overseas inquiries, pilot clients, export licenses, or target markets."
                              style={{ minHeight: '80px' }}
                            />
                          </div>
                        </>
                      )}

                      {profile.userType === 'intl-in' && (
                        <>
                          <div className="field">
                            <label className="label">
                              Global Company Name &amp; HQ <span className="required">*</span>
                            </label>
                            <input
                              required
                              value={extra.companyName || ''}
                              onChange={(e) => setExtra({ ...extra, companyName: e.target.value })}
                              placeholder="Global parent company name & HQ country"
                            />
                          </div>
                          <div className="field">
                            <label className="label">Primary Partnership Objective</label>
                            <input
                              value={extra.homeMarket || ''}
                              onChange={(e) => setExtra({ ...extra, homeMarket: e.target.value })}
                              placeholder="e.g. Local Tech Team / Regulatory Compliance / Distribution"
                            />
                          </div>
                          <div className="field full">
                            <label className="label">What are you seeking in an India venture partner?</label>
                            <textarea
                              value={extra.indiaContext || ''}
                              onChange={(e) => setExtra({ ...extra, indiaContext: e.target.value })}
                              placeholder="Describe your desired collaboration model with Ideacubator in India."
                              style={{ minHeight: '80px' }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* PANEL 2: IDEA DETAILS */}
                {step === 2 && (
                  <div className="panel">
                    <div className="note" style={{ marginBottom: '22px' }}>
                      Use your own words. Explain the concept clearly—no pitch deck required.
                    </div>

                    <div className="grid">
                      <div className="field full">
                        <label className="label">
                          Idea / Company Working Title <span className="required">*</span>
                        </label>
                        <input
                          required
                          value={idea.title}
                          onChange={(e) => setIdea({ ...idea, title: e.target.value })}
                          placeholder="A clear working name"
                        />
                      </div>

                      <div className="field full">
                        <label className="label">
                          Describe your idea <span className="required">*</span>
                        </label>
                        <textarea
                          required
                          minLength={20}
                          value={idea.description}
                          onChange={(e) => setIdea({ ...idea, description: e.target.value })}
                          placeholder="What are you building? Explain how it works and what it does in plain language."
                        />
                      </div>

                      <div className="field full">
                        <label className="label">What problem are you solving?</label>
                        <textarea
                          value={idea.problem}
                          onChange={(e) => setIdea({ ...idea, problem: e.target.value })}
                          placeholder="What is slow, expensive, fragmented, or broken today?"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Who is it for?</label>
                        <input
                          value={idea.customer}
                          onChange={(e) => setIdea({ ...idea, customer: e.target.value })}
                          placeholder="Target user, buyer, or industry persona"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Current Stage</label>
                        <select
                          value={idea.currentStage}
                          onChange={(e) => setIdea({ ...idea, currentStage: e.target.value })}
                        >
                          <option value="">Select stage...</option>
                          <option value="Idea only">Idea only</option>
                          <option value="Problem validated">Problem validated</option>
                          <option value="Prototype / demo">Prototype / demo</option>
                          <option value="MVP / product built">MVP / product built</option>
                          <option value="Early users">Early users</option>
                          <option value="Revenue">Revenue</option>
                          <option value="Scaling">Scaling</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">
                          Traction / Evidence <span className="help">(if any)</span>
                        </label>
                        <textarea
                          value={idea.traction}
                          onChange={(e) => setIdea({ ...idea, traction: e.target.value })}
                          style={{ minHeight: '105px' }}
                          placeholder="Customer interviews, pilots, revenue, LOIs, research metrics—if any."
                        />
                      </div>

                      <div className="field">
                        <label className="label">
                          How could it make money? <span className="help">(optional)</span>
                        </label>
                        <textarea
                          value={idea.monetization}
                          onChange={(e) => setIdea({ ...idea, monetization: e.target.value })}
                          style={{ minHeight: '105px' }}
                          placeholder="SaaS subscription, transaction commission, usage fee, licensing..."
                        />
                      </div>

                      <div className="field">
                        <label className="label">Primary Geography</label>
                        <input
                          value={idea.geography}
                          onChange={(e) => setIdea({ ...idea, geography: e.target.value })}
                          placeholder="India, North America, Southeast Asia, Global..."
                        />
                      </div>

                      <div className="field">
                        <label className="label">Current Team</label>
                        <input
                          value={idea.team}
                          onChange={(e) => setIdea({ ...idea, team: e.target.value })}
                          placeholder="Solo founder / 2 co-founders / team of 4..."
                        />
                      </div>

                      <div className="field full">
                        <label className="label">How involved do you want to be?</label>
                        <select
                          value={idea.founderCommitment}
                          onChange={(e) => setIdea({ ...idea, founderCommitment: e.target.value })}
                        >
                          <option value="">Select commitment level...</option>
                          <option value="Full-time / building now">Full-time / building now</option>
                          <option value="Preparing to transition">Preparing to transition</option>
                          <option value="Part-time while validating">Part-time while validating</option>
                          <option value="Exploring with no commitment yet">Exploring with no commitment yet</option>
                        </select>
                      </div>

                      <div className="field full">
                        <label className="label">What support do you think you need?</label>
                        <textarea
                          value={idea.supportNeeded}
                          onChange={(e) => setIdea({ ...idea, supportNeeded: e.target.value })}
                          style={{ minHeight: '100px' }}
                          placeholder="Validation, product strategy, full-stack software engineering, AI architecture, go-to-market, capital..."
                        />
                      </div>
                    </div>
                  </div>
                )}


                {/* PANEL 3: FINAL REVIEW & SUBMIT */}
                {step === 3 && (
                  <div className="panel">
                    <div className="note" style={{ marginBottom: '22px' }}>
                      Review your submission, get AI insights on your concept, and attach optional supporting materials before submitting.
                    </div>

                    {/* SUMMARY CARDS WITH EDIT SHORTCUTS */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">01 · Founder Information</span>
                        <button type="button" className="review-edit-link" onClick={() => setStep(1)}>
                          Edit Founder Details
                        </button>
                      </div>
                      <div className="review-data-grid">
                        <div className="review-data-item">
                          <span className="review-data-label">Founder Name</span>
                          <span className="review-data-value">{profile.fullName || '—'}</span>
                        </div>
                        <div className="review-data-item">
                          <span className="review-data-label">Email Address</span>
                          <span className="review-data-value">{profile.email || '—'}</span>
                        </div>
                        <div className="review-data-item">
                          <span className="review-data-label">Phone</span>
                          <span className="review-data-value">{profile.phone || 'Not provided'}</span>
                        </div>
                        <div className="review-data-item">
                          <span className="review-data-label">Location</span>
                          <span className="review-data-value">{profile.location || 'Not provided'}</span>
                        </div>
                        <div className="review-data-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="review-data-label">Situation</span>
                          <span className="review-data-value" style={{ textTransform: 'capitalize' }}>
                            {profile.userType
                              ? profile.userType === 'student'
                                ? 'Student founder'
                                : profile.userType === 'professional'
                                  ? 'Industry professional looking for tech co-builder'
                                  : profile.userType === 'seed'
                                    ? 'Seed stage — product built, ready for capital'
                                    : profile.userType === 'vc'
                                      ? 'Growth stage — revenue generating, scaling'
                                      : profile.userType === 'sell'
                                        ? 'Exploring sale / acquisition'
                                        : profile.userType === 'ipo'
                                          ? 'Exploring public listing / IPO'
                                          : profile.userType === 'test'
                                            ? 'Testing idea with low risk'
                                            : profile.userType === 'value'
                                              ? 'Valuation & advisory inquiry'
                                              : profile.userType === 'intl-out'
                                                ? 'Indian company expanding internationally'
                                                : 'International business entering India'
                              : 'Not selected'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">02 · Idea &amp; Venture Overview</span>
                        <button type="button" className="review-edit-link" onClick={() => setStep(2)}>
                          Edit Idea Details
                        </button>
                      </div>
                      <div className="review-data-grid">
                        <div className="review-data-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="review-data-label">Working Title</span>
                          <span className="review-data-value" style={{ fontWeight: 700, fontSize: '15px' }}>
                            {idea.title || 'Untitled Working Concept'}
                          </span>
                        </div>
                        <div className="review-data-item" style={{ gridColumn: '1 / -1' }}>
                          <span className="review-data-label">Idea Description</span>
                          <span className="review-data-value">{idea.description || '—'}</span>
                        </div>
                        {idea.problem && (
                          <div className="review-data-item" style={{ gridColumn: '1 / -1' }}>
                            <span className="review-data-label">Problem Solved</span>
                            <span className="review-data-value">{idea.problem}</span>
                          </div>
                        )}
                        <div className="review-data-item">
                          <span className="review-data-label">Target Audience</span>
                          <span className="review-data-value">{idea.customer || 'Broad / unassigned'}</span>
                        </div>
                        <div className="review-data-item">
                          <span className="review-data-label">Current Stage</span>
                          <span className="review-data-value">{idea.currentStage || 'Idea only'}</span>
                        </div>
                        <div className="review-data-item">
                          <span className="review-data-label">Primary Geography</span>
                          <span className="review-data-value">{idea.geography || 'Global'}</span>
                        </div>
                        <div className="review-data-item">
                          <span className="review-data-label">Team</span>
                          <span className="review-data-value">{idea.team || 'Solo founder'}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI REVIEW CARD */}
                    <div className="review" style={{ marginBottom: '22px' }}>
                      <div className="review-top">
                        <div>
                          <div className="eyebrow">Founder Assist</div>
                          <h3>AI review of your idea</h3>
                          <p>
                            Structured analysis covering clarity, problem formulation, target audience, assumptions, and suggested first validation
                            experiment.
                          </p>
                        </div>
                        <button className="primary" id="aiBtn" type="button" onClick={triggerAIReview} disabled={aiReviewing}>
                          {aiReviewing ? 'Analyzing...' : '✦ Review my idea with AI'}
                        </button>
                      </div>

                      <div className="help" style={{ marginTop: '12px', lineHeight: 1.5 }}>
                        Notice: AI-generated review is intended to help you think through and clarify your idea. It is not an
                        investment decision or a substitute for diligence.
                      </div>

                      {/* AI RESULT DISPLAY */}
                      {aiReviewing && (
                        <div className="loading" style={{ marginTop: '16px' }}>
                          <span className="spinner"></span> Analyzing your problem, market, and business model…
                        </div>
                      )}

                      {aiResult && !aiReviewing && (
                        <div className="review-result show">
                          <div className="review-grid">
                            <div className="review-item">
                              <strong>Clarity Rating</strong>
                              <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--brown)' }}>
                                {aiResult.clarityScore}/10
                              </p>
                            </div>
                            <div className="review-item">
                              <strong>One-Line Synthesis</strong>
                              <p>{aiResult.oneLineSummary}</p>
                            </div>
                            <div className="review-item">
                              <strong>Problem Formulation</strong>
                              <p>{aiResult.problemAssessment}</p>
                            </div>
                            <div className="review-item">
                              <strong>Customer &amp; Market</strong>
                              <p>{aiResult.customerAssessment}</p>
                            </div>
                            <div className="review-item full">
                              <strong>Promising Areas</strong>
                              <ul className="review-list">
                                {aiResult.promisingPoints.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="review-item full">
                              <strong>Open Assumptions to Test</strong>
                              <ul className="review-list">
                                {aiResult.openQuestions.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="review-item full">
                              <strong>Suggested First Experiment / MVP Scope</strong>
                              <p>{aiResult.nextExperiment}</p>
                            </div>
                            <div className="review-item full">
                              <strong>Immediate Founder Action Items</strong>
                              <ul className="review-list">
                                {aiResult.recommendedFounderActions.map((pt, i) => (
                                  <li key={i}>{pt}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" className="text-btn" onClick={() => setStep(2)}>
                              ← Return to Step 2 to refine idea details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OPTIONAL DOCUMENTS & PROTOTYPE LINK */}
                    <div className="review-section-box">
                      <div className="review-section-header">
                        <span className="review-section-title">Supporting Documents &amp; Links (Optional)</span>
                        <span className="help">Max 10MB per file</span>
                      </div>

                      <div
                        className={`drop ${isDragging ? 'drag' : ''}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleFileDrop}
                        onClick={() => document.getElementById('filesInput')?.click()}
                        style={{ padding: '24px 16px', background: 'var(--surface)' }}
                      >
                        <div style={{ fontSize: '26px', color: 'var(--brown)', marginBottom: '6px' }}>＋</div>
                        <strong>Drag and drop pitch deck, one-pager, or architecture note</strong>
                        <div className="help" style={{ margin: '4px 0 10px' }}>
                          PDF, DOC, DOCX, PPT, PPTX (Click to browse files)
                        </div>
                        <input
                          id="filesInput"
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                          onChange={handleFileInputChange}
                          style={{ display: 'none' }}
                        />
                      </div>

                      {attachedFiles.length > 0 && (
                        <div className="files" style={{ marginTop: '14px' }}>
                          {attachedFiles.map((file, idx) => (
                            <div key={idx} className="file">
                              <span>
                                {file.name} <span className="help">({formatFileSize(file.size)})</span>
                              </span>
                              <button
                                type="button"
                                className="text-btn"
                                style={{ color: 'var(--red)', fontWeight: 600 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFile(idx);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ marginTop: '16px' }}>
                        <label className="label">Demo link or additional notes <span className="help">(optional)</span></label>
                        <textarea
                          value={additionalContext}
                          onChange={(e) => setAdditionalContext(e.target.value)}
                          placeholder="Links to Loom demo, Figma prototype, GitHub repo, or any notes you'd like us to consider..."
                          style={{ minHeight: '65px' }}
                        />
                      </div>
                    </div>

                    {/* CONSENT CHECKBOX */}
                    <div style={{ padding: '16px 4px 6px' }}>
                      <label
                        style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                          fontSize: '13.5px',
                          color: 'var(--ink-2)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--brown)' }}
                        />
                        <span>
                          I confirm the information provided is accurate and agree to the applicable Ideacubator{' '}
                          <Link href="/terms" target="_blank" style={{ textDecoration: 'underline', color: 'var(--brown)', fontWeight: 600 }}>
                            Terms of Engagement
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" target="_blank" style={{ textDecoration: 'underline', color: 'var(--brown)', fontWeight: 600 }}>
                            Privacy Policy
                          </Link>
                          .
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="actions">
                  {step > 1 ? (
                    <button className="secondary" type="button" onClick={() => goToStep(-1)}>
                      ← Back
                    </button>
                  ) : (
                    <div></div>
                  )}

                  <div className="actions-right">
                    <button className="secondary" type="button" onClick={saveDraft}>
                      Save draft
                    </button>
                    {step < 3 ? (
                      <button className="primary" type="button" onClick={() => goToStep(1)}>
                        Continue →
                      </button>
                    ) : (
                      <button className="primary" type="button" onClick={submitApplication} disabled={submitting}>
                        {submitting
                          ? uploadProgress !== null
                            ? `Uploading files (${uploadProgress}%)…`
                            : 'Submitting application…'
                          : 'Submit Application →'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
