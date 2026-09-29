'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { auth, db, googleProvider } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import {
  collection,
  query,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

// ── SECRET HASHCODE PROTECTION ──
const SECRET_ADMIN_HASH = process.env.NEXT_PUBLIC_ADMIN_HASH || 'c7f93b8a2e10';

// ── STRICT ACCESS CONTROL: ONLY admin@ideacubator.in ──
const AUTHORIZED_ADMIN_EMAIL = 'admin@ideacubator.in';

const STAGE_LABELS: Record<number, string> = {
  1: 'Phase 01 — Diligence',
  2: 'Phase 02 — Validation',
  3: 'Phase 03 — Prototype / MVP',
  4: 'Phase 04 — Traction',
  5: 'Phase 05 — Scale & GTM'
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  received: { label: 'Received', color: 'var(--amber)', bg: 'var(--amber-soft)' },
  under_review: { label: 'Under Review', color: '#1d4ed8', bg: '#dbeafe' },
  meeting_scheduled: { label: 'Meeting Scheduled', color: '#7c3aed', bg: '#ede9fe' },
  approved: { label: 'Approved', color: 'var(--green)', bg: 'var(--green-soft)' },
  deferred: { label: 'Deferred', color: 'var(--ink-3)', bg: 'var(--paper-2)' }
};

const getDocTimestamp = (app: any): number => {
  const t = app?.metadata?.createdAt || app?.submittedAt || app?.createdAt || app?.timestamp;
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (typeof t.toDate === 'function') return t.toDate().getTime();
  if (typeof t.seconds === 'number') return t.seconds * 1000;
  if (typeof t === 'string' || typeof t === 'number') {
    const parsed = new Date(t).getTime();
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

const formatAppDate = (app: any): string => {
  const ms = getDocTimestamp(app);
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '—';
  }
};

const normalizeStatus = (raw?: string): string => {
  if (!raw) return 'received';
  const s = raw.toLowerCase().trim();
  if (s === 'approved' || s === 'accepted') return 'approved';
  if (s === 'under_review' || s === 'in_review') return 'under_review';
  if (s === 'meeting_scheduled' || s === 'scheduled') return 'meeting_scheduled';
  if (s === 'deferred' || s === 'rejected') return 'deferred';
  return 'received';
};

const getAppDocuments = (app: any): { activeDocs: any[]; deletedDocs: any[] } => {
  const all: any[] = [];
  if (Array.isArray(app.documents)) {
    app.documents.forEach((d: any) => {
      all.push({
        name: d.name || 'Attached Document',
        size: d.size,
        downloadUrl: d.downloadUrl || d.url || '#',
        storagePath: d.storagePath,
        isDeleted: Boolean(d.isDeleted),
        deletedAt: d.deletedAt
      });
    });
  }
  if (app.pitchDeck && typeof app.pitchDeck === 'object') {
    all.push({
      name: app.pitchDeck.name || 'Pitch Deck',
      size: app.pitchDeck.size,
      downloadUrl: app.pitchDeck.downloadUrl || app.pitchDeck.url || '#',
      isDeleted: Boolean(app.pitchDeck.isDeleted),
      deletedAt: app.pitchDeck.deletedAt
    });
  }
  return {
    activeDocs: all.filter((d) => !d.isDeleted),
    deletedDocs: all.filter((d) => d.isDeleted)
  };
};

type DrawerTab = 'founder' | 'idea' | 'chat' | 'meeting';

export default function SecureAdminConsolePage() {
  const params = useParams();
  const currentHash = (params?.hashcode as string) || '';

  // 1. Verify URL Hashcode
  if (currentHash !== SECRET_ADMIN_HASH) {
    notFound();
  }

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication Form State
  const [adminEmail, setAdminEmail] = useState('admin@ideacubator.in');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Data Collections
  const [applications, setApplications] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'ideas' | 'meetings' | 'chats'>('ideas');

  // Filters & Sorting for Table
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStage, setFilterStage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDeleted, setFilterDeleted] = useState<'active' | 'deleted' | 'all'>('active');
  const [sortBy, setSortBy] = useState('date_desc');

  // Side Drawer State
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('founder');

  // Approval Modal with Mandatory Comments
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [approving, setApproving] = useState(false);

  // In-Drawer Actions
  const [adminMsg, setAdminMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [updating, setUpdating] = useState(false);

  // In-Drawer Meeting Scheduling
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingSlot, setMeetingSlot] = useState('11:00 AM – 11:45 AM IST');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Auth Listener
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  // Strict check: ONLY admin@ideacubator.in
  const userEmailLower = (user?.email || '').toLowerCase().trim();
  const isAdmin = Boolean(user && user.email && userEmailLower === AUTHORIZED_ADMIN_EMAIL);

  // 1. Username / Password Login
  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!adminEmail || !adminPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    if (adminEmail.trim().toLowerCase() !== AUTHORIZED_ADMIN_EMAIL) {
      setAuthError(`Access restricted. Only ${AUTHORIZED_ADMIN_EMAIL} is authorized.`);
      return;
    }
    setSigningIn(true);
    try {
      await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
    } catch (err: any) {
      if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        setAuthError('Invalid credentials. Please verify your password.');
      } else {
        setAuthError(err.message || 'Authentication failed. Please check credentials.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  // 2. Google Sign In
  const handleGoogleSignIn = async () => {
    setAuthError('');
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        setAuthError('Popup was blocked by your browser. Please allow popups to sign in.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  // Applications Listener
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      collection(db, 'applications'),
      (snapshot) => {
        const apps: any[] = [];
        snapshot.forEach((d) => apps.push({ id: d.id, ...d.data() }));
        apps.sort((a, b) => getDocTimestamp(b) - getDocTimestamp(a));
        setApplications(apps);
        if (selectedApp) {
          const fresh = apps.find((a) => a.id === selectedApp.id);
          if (fresh) setSelectedApp(fresh);
        }
      },
      (err) => {
        console.warn('Admin apps listener warning:', err);
      }
    );
    return () => unsub();
  }, [isAdmin, selectedApp]);

  // Meetings Listener
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, 'meetings'), (snapshot) => {
      const mtgs: any[] = [];
      snapshot.forEach((d) => mtgs.push({ id: d.id, ...d.data() }));
      mtgs.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setMeetings(mtgs);
    });
    return () => unsub();
  }, [isAdmin]);

  // Messages Listener
  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, 'messages'), (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tA - tB;
      });
      setAllMessages(msgs);
    });
    return () => unsub();
  }, [isAdmin]);

  // Drawer Opener
  const openAppDrawer = (app: any, tab: DrawerTab = 'founder') => {
    setSelectedApp(app);
    setDrawerTab(tab);
    setIsDrawerOpen(true);
    setApprovalError('');
  };

  // Status & Stage Modifiers
  const handleUpdateStatus = async (status: string) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      const appRef = doc(db, 'applications', selectedApp.id);
      await updateDoc(appRef, {
        status,
        'metadata.status': status,
        'metadata.updatedAt': serverTimestamp()
      });
      showToast(`Status updated to "${status.replace('_', ' ')}"`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStage = async (stage: number) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      const appRef = doc(db, 'applications', selectedApp.id);
      await updateDoc(appRef, {
        stage,
        'metadata.stage': stage,
        'metadata.updatedAt': serverTimestamp()
      });
      showToast(`Venture advanced to Phase 0${stage}`);
    } catch (err: any) {
      alert('Failed to advance stage: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Mandatory Approval Trigger
  const triggerApproveModal = () => {
    setApprovalComment('');
    setApprovalError('');
    setIsApprovalModalOpen(true);
  };

  const handleConfirmApproval = async () => {
    if (!selectedApp) return;
    if (!approvalComment.trim()) {
      setApprovalError('Partner approval commentary is mandatory. Please provide investment/co-building rationale.');
      return;
    }
    setApproving(true);
    setApprovalError('');
    try {
      const appRef = doc(db, 'applications', selectedApp.id);
      const approverEmail = user?.email || 'admin@ideacubator.in';
      await updateDoc(appRef, {
        status: 'approved',
        stage: 2,
        approvalComment: approvalComment.trim(),
        approvedBy: approverEmail,
        approvedAt: serverTimestamp(),
        'metadata.status': 'approved',
        'metadata.stage': 2,
        'metadata.updatedAt': serverTimestamp()
      });

      // System audit message
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.idea?.title || selectedApp.title || 'Venture',
        senderUid: user?.uid || 'admin',
        senderName: user?.displayName || 'Ideacubator Review Board',
        senderRole: 'admin',
        content: `🎉 Congratulations! Your venture has been APPROVED for Ideacubator Studio Phase 02 Validation. Partner notes: "${approvalComment.trim()}"`,
        createdAt: serverTimestamp()
      });

      setIsApprovalModalOpen(false);
      showToast('Venture approved! Phase 02 (Problem Validation) unlocked.');
    } catch (err: any) {
      setApprovalError('Failed to approve venture: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  // Dispatch live chat message
  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsg.trim() || !selectedApp || !user) return;
    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.idea?.title || selectedApp.title || 'Venture',
        senderUid: user.uid,
        senderName: user.displayName || 'Ideacubator Diligence Team',
        senderRole: 'admin',
        content: adminMsg.trim(),
        createdAt: serverTimestamp()
      });
      setAdminMsg('');
    } catch (err: any) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  // Schedule diligence call
  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !meetingDate || !user) {
      alert('Please choose a date for the diligence session.');
      return;
    }
    setSchedulingMeeting(true);
    try {
      const founderEmail = selectedApp.founderEmail || selectedApp.email || selectedApp.profile?.email;
      const founderName = selectedApp.founderName || selectedApp.profile?.fullName || 'Founder';
      const ventureTitle = selectedApp.idea?.title || selectedApp.title || 'Venture';

      await addDoc(collection(db, 'meetings'), {
        applicationId: selectedApp.id,
        applicantUid: selectedApp.applicantUid || '',
        ventureTitle,
        founderName,
        founderEmail,
        partnerName: user.displayName || 'Ideacubator Partner',
        partnerEmail: user.email,
        date: meetingDate,
        timeSlot: meetingSlot,
        agenda: meetingAgenda.trim() || 'Phase 01 Studio Diligence & Model Evaluation',
        status: 'confirmed',
        meetLink: 'https://meet.google.com/ideacubator-diligence',
        createdAt: serverTimestamp()
      });

      const appRef = doc(db, 'applications', selectedApp.id);
      await updateDoc(appRef, {
        status: 'meeting_scheduled',
        'metadata.status': 'meeting_scheduled',
        'metadata.updatedAt': serverTimestamp()
      });

      setMeetingAgenda('');
      setMeetingDate('');
      showToast(`Diligence call booked with ${founderName}.`);
    } catch (err: any) {
      alert('Failed to book meeting: ' + err.message);
    } finally {
      setSchedulingMeeting(false);
    }
  };

  // Soft Delete Idea
  const handleSoftDeleteIdea = async (appId: string, ideaTitle: string) => {
    const ok = window.confirm(
      `Soft delete "${ideaTitle || 'this venture'}"?\n\nIt will be moved to the Archived/Deleted view and can be restored at any time.`
    );
    if (!ok) return;

    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, {
        isDeleted: true,
        deletedAt: serverTimestamp(),
        deletedBy: user?.email || 'admin@ideacubator.in',
        'metadata.updatedAt': serverTimestamp()
      });
      showToast(`Venture "${ideaTitle || ''}" soft-deleted.`);
    } catch (err: any) {
      alert('Failed to soft delete idea: ' + err.message);
    }
  };

  // Restore Idea
  const handleRestoreIdea = async (appId: string, ideaTitle: string) => {
    try {
      const appRef = doc(db, 'applications', appId);
      await updateDoc(appRef, {
        isDeleted: false,
        restoredAt: serverTimestamp(),
        restoredBy: user?.email || 'admin@ideacubator.in',
        'metadata.updatedAt': serverTimestamp()
      });
      showToast(`Venture "${ideaTitle || ''}" restored to active deals.`);
    } catch (err: any) {
      alert('Failed to restore idea: ' + err.message);
    }
  };

  // Filter & Sort Logic
  const filteredApps = applications.filter((app) => {
    const isDeleted = Boolean(app.isDeleted);
    if (filterDeleted === 'active' && isDeleted) return false;
    if (filterDeleted === 'deleted' && !isDeleted) return false;

    const title = (app.idea?.title || app.title || app.ideaName || '').toLowerCase();
    const founder = (app.founderName || app.profile?.fullName || app.name || '').toLowerCase();
    const email = (app.founderEmail || app.email || app.profile?.email || '').toLowerCase();
    const search = filterSearch.toLowerCase().trim();

    if (search && !title.includes(search) && !founder.includes(search) && !email.includes(search)) {
      return false;
    }

    const appStatus = normalizeStatus(app.status || app.metadata?.status);
    const appStage = Number(app.stage || (appStatus === 'approved' ? 2 : 1));

    if (filterStage !== 'all') {
      if (String(appStage) !== filterStage) return false;
    }

    if (filterStatus !== 'all') {
      if (appStatus !== filterStatus) return false;
    }

    return true;
  });

  // Sort
  filteredApps.sort((a, b) => {
    if (sortBy === 'date_desc') {
      return getDocTimestamp(b) - getDocTimestamp(a);
    }
    if (sortBy === 'date_asc') {
      return getDocTimestamp(a) - getDocTimestamp(b);
    }
    if (sortBy === 'stage_desc') {
      const sA = a.stage || (normalizeStatus(a.status) === 'approved' ? 2 : 1);
      const sB = b.stage || (normalizeStatus(b.status) === 'approved' ? 2 : 1);
      return sB - sA;
    }
    if (sortBy === 'stage_asc') {
      const sA = a.stage || (normalizeStatus(a.status) === 'approved' ? 2 : 1);
      const sB = b.stage || (normalizeStatus(b.status) === 'approved' ? 2 : 1);
      return sA - sB;
    }
    if (sortBy === 'name_asc') {
      const nA = (a.founderName || a.profile?.fullName || a.idea?.title || a.ideaName || '').toLowerCase();
      const nB = (b.founderName || b.profile?.fullName || b.idea?.title || b.ideaName || '').toLowerCase();
      return nA.localeCompare(nB);
    }
    return 0;
  });

  // Stage Metrics Calculations
  const countTotal = applications.length;
  const countActive = applications.filter((a) => !a.isDeleted).length;
  const countDeleted = applications.filter((a) => a.isDeleted).length;
  const countStage1 = applications.filter((a) => !a.isDeleted && (a.stage || (normalizeStatus(a.status) === 'approved' ? 2 : 1)) === 1).length;
  const countStage2 = applications.filter((a) => !a.isDeleted && (a.stage || (normalizeStatus(a.status) === 'approved' ? 2 : 1)) === 2).length;
  const countStage3 = applications.filter((a) => !a.isDeleted && a.stage === 3).length;
  const countStage4 = applications.filter((a) => !a.isDeleted && a.stage === 4).length;
  const countStage5 = applications.filter((a) => !a.isDeleted && a.stage === 5).length;

  if (loading) {
    return (
      <main className="page">
        <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--ink-2)', fontSize: '15px' }}>Verifying studio partner credentials…</p>
        </div>
      </main>
    );
  }

  // ── STRICT RESTRICTION: Not Signed In or Unauthorized ──
  if (!user || !isAdmin) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: '440px', margin: '60px auto' }}>
          <div className="card pad" style={{ textAlign: 'center', padding: '32px 28px' }}>
            <div style={{ fontSize: '38px', color: 'var(--brown)', marginBottom: '12px' }}>🔒</div>
            <span className="eyebrow" style={{ color: 'var(--brown)', letterSpacing: '0.08em' }}>
              Restricted Studio Console
            </span>
            <h2 style={{ fontSize: '22px', margin: '6px 0 10px' }}>Studio Diligence &amp; Review</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: '13.5px', marginBottom: '22px', lineHeight: 1.5 }}>
              Access is restricted strictly to authorized studio administrator (<strong>{AUTHORIZED_ADMIN_EMAIL}</strong>).
            </p>

            {authError && (
              <div
                style={{
                  background: '#fee2e2',
                  border: '1px solid #fca5a5',
                  color: 'var(--red)',
                  fontSize: '12.5px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  textAlign: 'left'
                }}
              >
                {authError}
              </div>
            )}

            {!user ? (
              <div>
                {/* 1. Email & Password Form for admin@ideacubator.in */}
                <form onSubmit={handleEmailPasswordSignIn} style={{ textAlign: 'left', marginBottom: '20px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-2)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Admin Username / Email
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@ideacubator.in"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-2)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Password
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      required
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        fontSize: '13px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="primary"
                    disabled={signingIn}
                    style={{ width: '100%', padding: '10px', fontSize: '13.5px', fontWeight: 700 }}
                  >
                    {signingIn ? 'Verifying Credentials…' : 'Sign In with Password'}
                  </button>
                </form>

                <div style={{ display: 'flex', alignItems: 'center', margin: '18px 0', color: 'var(--ink-3)', fontSize: '12px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                  <span style={{ padding: '0 10px', textTransform: 'uppercase', fontSize: '10.5px', letterSpacing: '0.05em' }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
                </div>

                {/* 2. Google Sign-In for admin@ideacubator.in Workspace account */}
                <button
                  className="google"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  style={{ width: '100%', fontSize: '13px', padding: '10px' }}
                >
                  Sign in with Google ({AUTHORIZED_ADMIN_EMAIL})
                </button>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    padding: '14px',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    marginBottom: '18px',
                    textAlign: 'left'
                  }}
                >
                  <p style={{ margin: '0 0 4px', fontSize: '13px', color: 'var(--red)', fontWeight: 700 }}>
                    🚫 Access Restricted
                  </p>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--red)', lineHeight: 1.4 }}>
                    Account <strong>{user.email}</strong> is not authorized to access this console. Only <strong>{AUTHORIZED_ADMIN_EMAIL}</strong> is permitted.
                  </p>
                </div>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => signOut(auth)}
                  style={{ width: '100%', padding: '9px', fontWeight: 700 }}
                >
                  Sign Out &amp; Switch Account
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // Filter messages & meetings for current drawer app
  const appMessages = selectedApp
    ? allMessages.filter((m) => m.applicationId === selectedApp.id)
    : [];

  const appMeetings = selectedApp
    ? meetings.filter((m) => m.applicationId === selectedApp.id)
    : [];

  return (
    <main className="page">
      <div className="container">
        {/* TOAST NOTIFICATION */}
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
              zIndex: 1005
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="page-head" style={{ marginBottom: '20px' }}>
          <div>
            <div className="eyebrow">Studio Operations &amp; Diligence Pipeline</div>
            <h1 className="title" style={{ fontSize: '24px', margin: '4px 0 0' }}>
              Venture Pipeline &amp; Diligence Console
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-2)' }}>
              Evaluate founder submissions, review pitch decks, advance venture stages, and manage diligences.
            </p>
          </div>
        </div>

        {/* ── TOP METRICS CARDS: COUNT BY STAGE ── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '24px'
          }}
        >
          <div className="card" style={{ padding: '14px 16px', background: 'var(--surface)' }}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', fontWeight: 700 }}>
              Total Intake
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--ink)', margin: '4px 0 0' }}>
              {countTotal}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>All submissions</span>
          </div>

          <div
            className="card"
            style={{
              padding: '14px 16px',
              background: 'var(--surface)',
              borderTop: '3px solid var(--amber)',
              cursor: 'pointer'
            }}
            onClick={() => {
              setFilterStage('1');
              setActiveTab('ideas');
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--amber)', fontWeight: 800 }}>
              Phase 01 Diligence
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--amber)', margin: '4px 0 0' }}>
              {countStage1}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Initial review</span>
          </div>

          <div
            className="card"
            style={{
              padding: '14px 16px',
              background: 'var(--surface)',
              borderTop: '3px solid #2563eb',
              cursor: 'pointer'
            }}
            onClick={() => {
              setFilterStage('2');
              setActiveTab('ideas');
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2563eb', fontWeight: 800 }}>
              Phase 02 Validation
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#2563eb', margin: '4px 0 0' }}>
              {countStage2}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Approved concepts</span>
          </div>

          <div
            className="card"
            style={{
              padding: '14px 16px',
              background: 'var(--surface)',
              borderTop: '3px solid #7c3aed',
              cursor: 'pointer'
            }}
            onClick={() => {
              setFilterStage('3');
              setActiveTab('ideas');
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#7c3aed', fontWeight: 800 }}>
              Phase 03 MVP Build
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#7c3aed', margin: '4px 0 0' }}>
              {countStage3}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Engineering sprint</span>
          </div>

          <div
            className="card"
            style={{
              padding: '14px 16px',
              background: 'var(--surface)',
              borderTop: '3px solid #0d9488',
              cursor: 'pointer'
            }}
            onClick={() => {
              setFilterStage('4');
              setActiveTab('ideas');
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0d9488', fontWeight: 800 }}>
              Phase 04 Traction
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0d9488', margin: '4px 0 0' }}>
              {countStage4}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Early users &amp; revenue</span>
          </div>

          <div
            className="card"
            style={{
              padding: '14px 16px',
              background: 'var(--surface)',
              borderTop: '3px solid var(--green)',
              cursor: 'pointer'
            }}
            onClick={() => {
              setFilterStage('5');
              setActiveTab('ideas');
            }}
          >
            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--green)', fontWeight: 800 }}>
              Phase 05 Scaled
            </span>
            <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--green)', margin: '4px 0 0' }}>
              {countStage5}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Spin-out / GTM</span>
          </div>
        </div>

        {/* ── 2-COLUMN SHELL: LEFT NAV + MAIN CONTENT ── */}
        <div className="shell" style={{ alignItems: 'flex-start' }}>
          {/* ── LEFT NAVIGATION SIDEBAR ── */}
          <aside className="sidebar">
            <div style={{ marginBottom: '12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
              Studio Console Nav
            </div>

            <button
              type="button"
              className={`side-link ${activeTab === 'ideas' ? 'active' : ''}`}
              onClick={() => setActiveTab('ideas')}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>📋 Deals &amp; Submissions</span>
              <span className="badge" style={{ fontSize: '10px' }}>{applications.length}</span>
            </button>

            <button
              type="button"
              className={`side-link ${activeTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setActiveTab('meetings')}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>📅 Diligence Calls</span>
              <span className="badge" style={{ fontSize: '10px' }}>{meetings.length}</span>
            </button>

            <button
              type="button"
              className={`side-link ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>💬 Founder Live Chats</span>
              <span className="badge" style={{ fontSize: '10px' }}>{allMessages.length}</span>
            </button>

            {/* Admin Account & Sign Out */}
            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginBottom: '4px' }}>
                Signed in as:
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <button
                type="button"
                onClick={() => signOut(auth)}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  background: 'none',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '5px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: 'var(--red)'
                }}
              >
                Sign Out
              </button>
            </div>
          </aside>

          {/* ── RIGHT MAIN CONTENT ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* VIEW 1: DATA TABLE */}
            {activeTab === 'ideas' && (
              <div className="card pad" style={{ padding: '20px' }}>
                {/* TOOLBAR: SEARCH ON LEFT 30%, 3 DROPDOWNS ON RIGHT 70% IN ONE SINGLE ROW */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '14px',
                    padding: '10px 14px',
                    background: 'var(--surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                >
                  {/* LEFT 30%: SEARCH INPUT */}
                  <div style={{ width: '30%', position: 'relative', flexShrink: 0, minWidth: 0, boxSizing: 'border-box' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '12px',
                        color: 'var(--ink-3)',
                        pointerEvents: 'none'
                      }}
                    >
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search ventures, founders..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 26px 6px 28px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        boxSizing: 'border-box',
                        height: '32px'
                      }}
                    />
                    {filterSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterSearch('')}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--ink-3)',
                          fontSize: '11px',
                          padding: '2px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* RIGHT 70%: STAGE, STATUS, SORT (ALL 3 IN ONE ROW NEXT TO EACH OTHER) */}
                  <div
                    style={{
                      width: '70%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '8px',
                      flexWrap: 'nowrap',
                      minWidth: 0,
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Stage Filter */}
                    <select
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        maxWidth: '135px',
                        height: '32px',
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                      title="Filter by Stage"
                    >
                      <option value="all">Stage: All</option>
                      <option value="1">Phase 01 Diligence</option>
                      <option value="2">Phase 02 Validation</option>
                      <option value="3">Phase 03 MVP Build</option>
                      <option value="4">Phase 04 Traction</option>
                      <option value="5">Phase 05 Scale</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        maxWidth: '135px',
                        height: '32px',
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                      title="Filter by Status"
                    >
                      <option value="all">Status: All</option>
                      <option value="received">Received</option>
                      <option value="under_review">Under Review</option>
                      <option value="meeting_scheduled">Meeting Set</option>
                      <option value="approved">Approved</option>
                      <option value="deferred">Deferred</option>
                    </select>

                    {/* Sort By Filter */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        maxWidth: '135px',
                        height: '32px',
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        borderRadius: '6px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        boxSizing: 'border-box'
                      }}
                      title="Sort Ventures"
                    >
                      <option value="date_desc">Sort: Newest</option>
                      <option value="date_asc">Sort: Oldest</option>
                      <option value="stage_desc">Sort: Stage (High)</option>
                      <option value="stage_asc">Sort: Stage (Low)</option>
                      <option value="name_asc">Sort: Founder (A-Z)</option>
                    </select>

                    {/* Clear Button if any filter active */}
                    {(filterSearch || filterStage !== 'all' || filterStatus !== 'all' || filterDeleted !== 'active') && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterSearch('');
                          setFilterStage('all');
                          setFilterStatus('all');
                          setFilterDeleted('active');
                        }}
                        style={{
                          flex: '0 0 auto',
                          background: 'none',
                          border: 'none',
                          color: 'var(--brown)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 4px',
                          textDecoration: 'underline',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ✕ Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* TABLE SUB-BAR: ACTIVE/DELETED TABS + VENTURES COUNTER */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: 'var(--ink-3)',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'inline-flex', background: 'var(--surface)', padding: '2px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <button
                      type="button"
                      onClick={() => setFilterDeleted('active')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: filterDeleted === 'active' ? 'var(--ink)' : 'transparent',
                        color: filterDeleted === 'active' ? 'var(--paper)' : 'var(--ink-2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      Active Deals ({countActive})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDeleted('deleted')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: filterDeleted === 'deleted' ? 'var(--amber)' : 'transparent',
                        color: filterDeleted === 'deleted' ? '#fff' : 'var(--ink-2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      🗑 Deleted ({countDeleted})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterDeleted('all')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        background: filterDeleted === 'all' ? 'var(--ink-2)' : 'transparent',
                        color: filterDeleted === 'all' ? '#fff' : 'var(--ink-2)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      All ({applications.length})
                    </button>
                  </div>

                  <span>
                    Showing <strong>{filteredApps.length}</strong> {filterDeleted === 'deleted' ? 'archived' : 'active'} ventures
                    {filterStage !== 'all' && ` · Phase 0${filterStage}`}
                    {filterStatus !== 'all' && ` · ${(STATUS_CONFIG[filterStatus] || {}).label || filterStatus}`}
                  </span>
                </div>

                {/* DATA TABLE WITH FIXED COLUMN WIDTHS AND CLEAN ELLIPSIS */}
                {filteredApps.length > 0 ? (
                  <div style={{ overflowX: 'auto', width: '100%' }}>
                    <table
                      style={{
                        width: '100%',
                        tableLayout: 'fixed',
                        borderCollapse: 'collapse'
                      }}
                    >
                      <colgroup>
                        <col style={{ width: '22%' }} />
                        <col style={{ width: '32%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '6%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '5%' }} />
                      </colgroup>
                      <thead>
                        <tr
                          style={{
                            borderBottom: '2px solid var(--line)',
                            textAlign: 'left',
                            fontSize: '11px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            color: 'var(--ink-3)'
                          }}
                        >
                          <th style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Founder</th>
                          <th style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Venture &amp; Concept</th>
                          <th style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Stage</th>
                          <th style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Status</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Deck</th>
                          <th style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Submitted</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map((app) => {
                          const statusKey = normalizeStatus(app.status || app.metadata?.status);
                          const statusConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.received;
                          const { activeDocs } = getAppDocuments(app);
                          const docsCount = activeDocs.length;
                          const submittedDate = formatAppDate(app);
                          const stageNum = Number(app.stage || (statusKey === 'approved' ? 2 : 1));
                          const appTitle = app.idea?.title || app.title || app.ideaName || 'Untitled Venture';
                          const isDeleted = Boolean(app.isDeleted);
                          const founderName = app.founderName || app.profile?.fullName || app.name || 'Anonymous Founder';
                          const founderEmail = app.founderEmail || app.email || app.profile?.email || '—';
                          const concept = app.idea?.problem || app.problem || app.ideaSummary || app.idea?.description || app.description || 'No description provided';

                          return (
                            <tr
                              key={app.id}
                              onClick={() => openAppDrawer(app, 'founder')}
                              style={{
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--line)',
                                transition: 'background 0.15s ease',
                                background: isDeleted ? 'rgba(239, 68, 68, 0.04)' : undefined
                              }}
                              title="Click row to open diligence and review details"
                            >
                              {/* FOUNDER (ELLIPSIS) */}
                              <td style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {founderName}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '1px' }}>
                                  {founderEmail}
                                </div>
                              </td>

                              {/* VENTURE & CONCEPT (ELLIPSIS) */}
                              <td style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <strong style={{ fontSize: '12.5px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {appTitle}
                                  </strong>
                                  {isDeleted && (
                                    <span style={{ fontSize: '9px', background: '#fee2e2', color: 'var(--red)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, flexShrink: 0 }}>
                                      DEL
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: '11px',
                                    color: 'var(--ink-3)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    marginTop: '1px'
                                  }}
                                >
                                  {concept}
                                </div>
                              </td>

                              {/* STAGE (ELLIPSIS) */}
                              <td style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: '10.5px',
                                    padding: '2px 7px',
                                    background: stageNum >= 2 ? 'var(--green-soft)' : 'var(--cream)',
                                    color: stageNum >= 2 ? 'var(--green)' : 'var(--brown)',
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Phase 0{stageNum}
                                </span>
                              </td>

                              {/* STATUS (ELLIPSIS) */}
                              <td style={{ padding: '8px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <span
                                  style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: '999px',
                                    background: isDeleted ? '#fee2e2' : statusConf.bg,
                                    color: isDeleted ? 'var(--red)' : statusConf.color,
                                    display: 'inline-block',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {isDeleted ? 'Deleted' : statusConf.label}
                                </span>
                              </td>

                              {/* DECK (COMPACT CENTERED) */}
                              <td style={{ padding: '8px 10px', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {docsCount > 0 ? (
                                  <span
                                    style={{
                                      fontSize: '10.5px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      background: 'var(--paper-2)',
                                      color: 'var(--ink)',
                                      fontWeight: 600
                                    }}
                                  >
                                    📎 {docsCount}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--ink-4)' }}>—</span>
                                )}
                              </td>

                              {/* SUBMITTED DATE (ELLIPSIS) */}
                              <td style={{ padding: '8px 10px', fontSize: '11px', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {submittedDate}
                              </td>

                              {/* ACTION: SOFT DELETE OR RESTORE */}
                              <td style={{ padding: '8px 10px', textAlign: 'right', overflow: 'hidden', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', justifyContent: 'flex-end' }}>
                                  {isDeleted ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRestoreIdea(app.id, appTitle)}
                                      style={{
                                        fontSize: '10.5px',
                                        padding: '3px 7px',
                                        background: 'var(--green-soft)',
                                        color: 'var(--green)',
                                        border: '1px solid #bbf7d0',
                                        borderRadius: '5px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                      }}
                                      title="Restore venture to active deals"
                                    >
                                      ♻ Restore
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      title="Soft delete venture"
                                      onClick={() => handleSoftDeleteIdea(app.id, appTitle)}
                                      style={{
                                        fontSize: '11.5px',
                                        padding: '3px 6px',
                                        background: 'transparent',
                                        color: 'var(--ink-3)',
                                        border: '1px solid var(--line)',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                        lineHeight: 1
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.color = 'var(--red)';
                                        e.currentTarget.style.borderColor = 'var(--red)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'var(--ink-3)';
                                        e.currentTarget.style.borderColor = 'var(--line)';
                                      }}
                                    >
                                      🗑
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' }}>
                    No submissions matching current criteria.
                  </div>
                )}
              </div>
            )}

            {/* VIEW 2: DILIGENCE CALLS & MEETINGS */}
            {activeTab === 'meetings' && (
              <div className="card pad" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 16px' }}>Scheduled Founder Diligence Sessions</h3>
                {meetings.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {meetings.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: '14px 16px',
                          background: 'var(--surface)',
                          borderRadius: '8px',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px' }}>{m.founderName}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>({m.ventureTitle})</span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '4px' }}>
                            📅 {m.date} · ⏰ {m.timeSlot}
                          </div>
                          {m.agenda && (
                            <div style={{ fontSize: '11.5px', color: 'var(--ink-3)', marginTop: '2px', fontStyle: 'italic' }}>
                              &ldquo;{m.agenda}&rdquo;
                            </div>
                          )}
                        </div>
                        {m.meetLink && (
                          <a
                            href={m.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="primary"
                            style={{ fontSize: '11.5px', padding: '6px 14px', textDecoration: 'none' }}
                          >
                            Join Session ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                    No diligence sessions scheduled yet.
                  </p>
                )}
              </div>
            )}

            {/* VIEW 3: LIVE FOUNDER CHATS */}
            {activeTab === 'chats' && (
              <div className="card pad" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '16px', margin: '0 0 16px' }}>Direct Founder Conversations</h3>
                {allMessages.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {allMessages.slice(-20).map((msg) => {
                      const appMatch = applications.find((a) => a.id === msg.applicationId);
                      return (
                        <div
                          key={msg.id}
                          style={{
                            padding: '12px 14px',
                            background: 'var(--surface)',
                            borderRadius: '8px',
                            border: '1px solid var(--line)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <strong>{msg.applicationTitle || appMatch?.idea?.title || 'Venture'}</strong>
                              <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>• {msg.senderName} ({msg.senderRole})</span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-2)' }}>
                              &ldquo;{msg.content || msg.body}&rdquo;
                            </p>
                          </div>
                          {appMatch && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openAppDrawer(appMatch, 'chat')}
                              style={{ fontSize: '11px', padding: '6px 12px' }}
                            >
                              Reply in Thread →
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                    No live chat messages recorded yet.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SLIDE-OVER SIDE DRAWER: 4 COMPREHENSIVE REVIEW TABS
      ════════════════════════════════════════════════════════════════ */}
      <div className={`drawer-backdrop ${isDrawerOpen ? 'open' : ''}`} onClick={() => setIsDrawerOpen(false)}>
        <div className="slide-drawer" onClick={(e) => e.stopPropagation()} style={{ width: 'min(620px, 94vw)' }}>
          {selectedApp && (
            <>
              {/* DRAWER HEADER */}
              <div className="drawer-header">
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge" style={{ fontSize: '11px' }}>
                      Phase 0{selectedApp.stage || 1}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: (STATUS_CONFIG[(selectedApp.status || 'received').toLowerCase()] || STATUS_CONFIG.received).bg,
                        color: (STATUS_CONFIG[(selectedApp.status || 'received').toLowerCase()] || STATUS_CONFIG.received).color,
                        textTransform: 'capitalize'
                      }}
                    >
                      {(selectedApp.status || 'received').replace('_', ' ')}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: '19px', color: 'var(--ink)' }}>
                    {selectedApp.idea?.title || selectedApp.title || selectedApp.ideaName || 'Untitled Venture'}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--ink-2)', marginTop: '2px' }}>
                    Founder: <strong>{selectedApp.founderName || selectedApp.profile?.fullName || 'Founder'}</strong>
                    {' · '}
                    <span>{selectedApp.founderEmail || selectedApp.email || selectedApp.profile?.email}</span>
                  </div>
                  {selectedApp.isDeleted && (
                    <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '3px 8px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #fca5a5' }}>
                      <span style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 700 }}>⚠️ Venture is soft-deleted</span>
                      <button
                        type="button"
                        onClick={() => handleRestoreIdea(selectedApp.id, selectedApp.idea?.title || selectedApp.title)}
                        style={{ fontSize: '10.5px', padding: '2px 6px', background: 'var(--green)', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        ♻ Restore
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--ink-3)' }}
                >
                  ✕
                </button>
              </div>

              {/* ACTION STRIP */}
              <div className="drawer-action-strip">
                <button
                  type="button"
                  className="drawer-action-btn"
                  onClick={() => setDrawerTab('chat')}
                  style={{ fontWeight: drawerTab === 'chat' ? 700 : 500 }}
                >
                  💬 Live Chat
                </button>
                <button
                  type="button"
                  className="drawer-action-btn"
                  onClick={() => setDrawerTab('meeting')}
                  style={{ fontWeight: drawerTab === 'meeting' ? 700 : 500 }}
                >
                  📅 Book Diligence Call
                </button>
                {selectedApp.founderPhone && (
                  <a
                    href={`https://wa.me/${selectedApp.founderPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedApp.founderName || 'Founder'}, this is Ideacubator studio team regarding your venture "${selectedApp.idea?.title || selectedApp.title || 'Untitled'}".`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drawer-action-btn whatsapp-action"
                    style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    🟢 WhatsApp (+{selectedApp.founderPhone})
                  </a>
                )}
              </div>

              {/* 4 REVIEW TABS */}
              <div className="drawer-tab-nav">
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'founder' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('founder')}
                >
                  👤 Founder Profile
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'idea' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('idea')}
                >
                  💡 Venture &amp; Stage
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('chat')}
                >
                  💬 Chat ({appMessages.length})
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'meeting' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('meeting')}
                >
                  📅 Call ({appMeetings.length})
                </button>
              </div>

              {/* DRAWER CONTENT */}
              <div className="drawer-content">
                {/* TAB 1: FOUNDER PROFILE */}
                {drawerTab === 'founder' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '10px' }}>
                        Primary Contact &amp; Background
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Full Name</span>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--ink)' }}>
                            {selectedApp.founderName || selectedApp.profile?.fullName || '—'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Email</span>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {selectedApp.founderEmail || selectedApp.email || selectedApp.profile?.email || '—'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Phone Number</span>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {selectedApp.founderPhone || selectedApp.profile?.phone || 'Not provided'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Location</span>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {selectedApp.founderLocation || selectedApp.profile?.location || 'Not provided'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Role / Domain</span>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {selectedApp.profile?.role || '—'}
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Experience</span>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                            {selectedApp.profile?.experienceYears ? `${selectedApp.profile.experienceYears} Years` : '—'}
                          </div>
                        </div>
                      </div>

                      {selectedApp.profile?.linkedIn && (
                        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>LinkedIn: </span>
                          <a
                            href={selectedApp.profile.linkedIn.startsWith('http') ? selectedApp.profile.linkedIn : `https://${selectedApp.profile.linkedIn}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: 'var(--brown)', textDecoration: 'underline' }}
                          >
                            {selectedApp.profile.linkedIn}
                          </a>
                        </div>
                      )}
                    </div>

                    {selectedApp.extra && Object.keys(selectedApp.extra).length > 0 && (
                      <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '10px' }}>
                          Specific Situation Details
                        </div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {Object.entries(selectedApp.extra).map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                              <span style={{ color: 'var(--ink-3)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                              <strong style={{ color: 'var(--ink)' }}>{String(v)}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: VENTURE BLUEPRINT & ADJUDICATION */}
                {drawerTab === 'idea' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown)', marginBottom: '10px' }}>
                        Studio Adjudication &amp; Stage Control
                      </div>

                      <div className="grid" style={{ marginBottom: '12px' }}>
                        <div className="field">
                          <label className="label">Evaluation Status</label>
                          <select
                            value={(selectedApp.status || 'received').toLowerCase()}
                            onChange={(e) => handleUpdateStatus(e.target.value)}
                            disabled={updating}
                            style={{ fontWeight: 600 }}
                          >
                            <option value="received">Received</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved for Co-Building</option>
                            <option value="deferred">Deferred / Archive</option>
                          </select>
                        </div>

                        <div className="field">
                          <label className="label">Active Studio Phase</label>
                          <select
                            value={selectedApp.stage || 1}
                            onChange={(e) => handleUpdateStage(Number(e.target.value))}
                            disabled={updating}
                            style={{ fontWeight: 600 }}
                          >
                            <option value="1">Phase 01 — Diligence (Default)</option>
                            {(selectedApp.status || '').toLowerCase() === 'approved' ? (
                              <>
                                <option value="2">Phase 02 — Problem Validation</option>
                                <option value="3">Phase 03 — Technical MVP Build</option>
                                <option value="4">Phase 04 — Customer Traction</option>
                                <option value="5">Phase 05 — Scale &amp; GTM</option>
                              </>
                            ) : null}
                          </select>
                        </div>
                      </div>

                      {(selectedApp.status || '').toLowerCase() !== 'approved' ? (
                        <div
                          style={{
                            padding: '12px 14px',
                            background: 'var(--cream)',
                            borderRadius: '10px',
                            border: '1px solid var(--brown-soft)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '8px'
                          }}
                        >
                          <div style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.4 }}>
                            <strong>🔒 Phase 02 (Validation) is locked:</strong>
                            <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>
                              Approve this venture with mandatory partner comments to unlock Phase 02 and co-building.
                            </div>
                          </div>
                          <button
                            type="button"
                            className="primary"
                            onClick={triggerApproveModal}
                            disabled={updating}
                            style={{ fontSize: '11.5px', padding: '7px 14px', flexShrink: 0 }}
                          >
                            ✓ Approve Venture →
                          </button>
                        </div>
                      ) : (
                        <div style={{ padding: '12px 14px', background: 'var(--green-soft)', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                          <div style={{ fontSize: '12.5px', color: 'var(--green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            ✓ Venture Approved for Studio Co-Building
                          </div>
                          {selectedApp.approvedBy && (
                            <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
                              Approved by <strong>{selectedApp.approvedBy}</strong>
                            </div>
                          )}
                          {selectedApp.approvalComment && (
                            <div style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--ink)', background: 'var(--surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--line)', fontStyle: 'italic' }}>
                              &ldquo;{selectedApp.approvalComment}&rdquo;
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ATTACHED DOCUMENTS & PITCH DECKS */}
                    {(() => {
                      const { activeDocs, deletedDocs } = getAppDocuments(selectedApp);
                      return (
                        <div style={{ display: 'grid', gap: '14px' }}>
                          <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '8px' }}>
                              Pitch Decks &amp; Attached Files ({activeDocs.length})
                            </div>
                            {activeDocs.length > 0 ? (
                              <div style={{ display: 'grid', gap: '8px' }}>
                                {activeDocs.map((doc, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '10px 14px',
                                      background: 'var(--surface)',
                                      borderRadius: '8px',
                                      border: '1px solid var(--line)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                      <span style={{ fontSize: '16px' }}>📄</span>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {doc.name || 'Pitch Deck'}
                                        </div>
                                        {doc.size && (
                                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                                            {(doc.size / 1024).toFixed(1)} KB
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {doc.downloadUrl && doc.downloadUrl !== '#' && (
                                      <a
                                        href={doc.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="secondary"
                                        style={{ fontSize: '11px', padding: '5px 12px', textDecoration: 'none', fontWeight: 600 }}
                                      >
                                        Download ↗
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--ink-3)' }}>
                                No pitch deck files attached for this submission.
                              </p>
                            )}
                          </div>

                          {/* SOFT-DELETED AUDIT DOCUMENTS */}
                          {deletedDocs.length > 0 && (
                            <div style={{ padding: '14px 16px', background: 'rgba(239, 68, 68, 0.04)', borderRadius: '12px', border: '1px dashed var(--line)' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--red)', marginBottom: '8px' }}>
                                🗑 Archived / Removed Files ({deletedDocs.length}) — Preserved on Disk
                              </div>
                              <div style={{ display: 'grid', gap: '6px' }}>
                                {deletedDocs.map((doc, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '8px 12px',
                                      background: 'var(--surface)',
                                      borderRadius: '6px',
                                      border: '1px solid var(--line)',
                                      opacity: 0.85
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <span style={{ fontSize: '12px', color: 'var(--ink-2)', textDecoration: 'line-through' }}>
                                        {doc.name || 'Archived File'}
                                      </span>
                                      <span style={{ fontSize: '10px', color: 'var(--ink-3)', marginLeft: '8px' }}>
                                        (Removed by applicant)
                                      </span>
                                    </div>
                                    {doc.downloadUrl && doc.downloadUrl !== '#' && (
                                      <a
                                        href={doc.downloadUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '10.5px', color: 'var(--brown)', textDecoration: 'underline' }}
                                      >
                                        Audit File ↗
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* VENTURE BLUEPRINT */}
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '10px' }}>
                        Executive Concept Overview
                      </div>
                      <div style={{ display: 'grid', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Idea Description</span>
                          <div style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '2px', lineHeight: 1.5 }}>
                            {selectedApp.idea?.description || selectedApp.description || selectedApp.ideaSummary || 'No description provided'}
                          </div>
                        </div>

                        {(selectedApp.idea?.problem || selectedApp.problem) && (
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Core Problem</span>
                            <div style={{ fontSize: '13px', color: 'var(--ink)', marginTop: '2px', lineHeight: 1.5 }}>
                              {selectedApp.idea?.problem || selectedApp.problem}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Target Customer</span>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                              {selectedApp.idea?.customer || selectedApp.customer || '—'}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Business Model</span>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                              {selectedApp.idea?.monetization || selectedApp.monetization || '—'}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Current Traction</span>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                              {selectedApp.idea?.traction || selectedApp.traction || '—'}
                            </div>
                          </div>
                          <div>
                            <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>Geography</span>
                            <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>
                              {selectedApp.idea?.geography || selectedApp.geography || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: LIVE FOUNDER CHAT */}
                {drawerTab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '460px' }}>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {appMessages.map((m) => {
                        const isStudio = m.senderRole === 'admin';
                        return (
                          <div key={m.id} className={`chat-row ${isStudio ? 'mine' : 'theirs'}`}>
                            <div className="chat-bubble" style={{ background: isStudio ? 'var(--ink)' : 'var(--surface)', color: isStudio ? 'var(--paper)' : 'var(--ink)' }}>
                              {m.content}
                            </div>
                            <div className="chat-info">
                              <span>{isStudio ? 'You (Studio)' : m.senderName || 'Founder'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {appMessages.length === 0 && (
                        <p style={{ color: 'var(--ink-3)', fontSize: '13px', textAlign: 'center', margin: 'auto' }}>
                          No direct messages recorded for this venture yet. Type below to reach out to the founder.
                        </p>
                      )}
                    </div>
                    <form onSubmit={handleSendAdminMessage} style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                      <input
                        value={adminMsg}
                        onChange={(e) => setAdminMsg(e.target.value)}
                        placeholder={`Message ${selectedApp.founderName || 'Founder'}...`}
                        style={{ flex: 1, padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--line)', background: 'var(--paper)' }}
                      />
                      <button type="submit" className="primary" disabled={sendingMsg} style={{ padding: '8px 16px', fontSize: '12.5px' }}>
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 4: SCHEDULE DILIGENCE CALL */}
                {drawerTab === 'meeting' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '10px' }}>
                        Book Video Diligence Call
                      </div>
                      <form onSubmit={handleScheduleMeeting} style={{ display: 'grid', gap: '12px' }}>
                        <div className="grid">
                          <div className="field">
                            <label className="label">Date</label>
                            <input
                              type="date"
                              required
                              value={meetingDate}
                              onChange={(e) => setMeetingDate(e.target.value)}
                            />
                          </div>
                          <div className="field">
                            <label className="label">Time Slot</label>
                            <select value={meetingSlot} onChange={(e) => setMeetingSlot(e.target.value)}>
                              <option value="10:00 AM – 10:45 AM IST">10:00 AM – 10:45 AM IST</option>
                              <option value="11:00 AM – 11:45 AM IST">11:00 AM – 11:45 AM IST</option>
                              <option value="02:00 PM – 02:45 PM IST">02:00 PM – 02:45 PM IST</option>
                              <option value="04:00 PM – 04:45 PM IST">04:00 PM – 04:45 PM IST</option>
                              <option value="06:00 PM – 06:45 PM IST">06:00 PM – 06:45 PM IST</option>
                            </select>
                          </div>
                        </div>

                        <div className="field">
                          <label className="label">Agenda / Diligence Focus</label>
                          <input
                            value={meetingAgenda}
                            onChange={(e) => setMeetingAgenda(e.target.value)}
                            placeholder="e.g. Unit economics review, prototype walk-through, tech architecture"
                          />
                        </div>

                        <button type="submit" className="primary" disabled={schedulingMeeting} style={{ width: '100%', padding: '10px' }}>
                          {schedulingMeeting ? 'Scheduling Call…' : 'Schedule Diligence Session & Dispatch Calendar Invite'}
                        </button>
                      </form>
                    </div>

                    {appMeetings.length > 0 && (
                      <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '8px' }}>
                          Scheduled Sessions ({appMeetings.length})
                        </div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {appMeetings.map((m) => (
                            <div key={m.id} style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{m.date} · {m.timeSlot}</div>
                                <div style={{ fontSize: '11.5px', color: 'var(--ink-3)' }}>{m.agenda}</div>
                              </div>
                              {m.meetLink && (
                                <a href={m.meetLink} target="_blank" rel="noopener noreferrer" className="secondary" style={{ fontSize: '11px', padding: '4px 10px', textDecoration: 'none' }}>
                                  Meet Link ↗
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          APPROVAL MODAL WITH MANDATORY PARTNER COMMENTS
      ════════════════════════════════════════════════════════════════ */}
      {isApprovalModalOpen && selectedApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => !approving && setIsApprovalModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--paper)',
              borderRadius: '14px',
              border: '1px solid var(--line)',
              width: 'min(520px, 94vw)',
              padding: '24px',
              boxShadow: 'var(--shadow)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--green)' }}>Studio Diligence Milestone</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '18px' }}>Approve Venture for Studio Co-Building</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsApprovalModalOpen(false)}
                disabled={approving}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--ink-3)' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Approving <strong>{selectedApp.idea?.title || selectedApp.title || 'this venture'}</strong> will advance it to{' '}
              <strong>Phase 02 (Validation)</strong>. Mandatory comments are required for audit diligence and are visible to the founder.
            </p>

            {approvalError && (
              <div style={{ padding: '8px 12px', background: '#fee2e2', border: '1px solid #fca5a5', color: 'var(--red)', fontSize: '12px', borderRadius: '6px', marginBottom: '12px' }}>
                {approvalError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--ink)' }}>
                Partner Approval Commentary &amp; Thesis <span style={{ color: 'var(--red)' }}>*</span>
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => {
                  setApprovalComment(e.target.value);
                  if (approvalError) setApprovalError('');
                }}
                placeholder="Explain why this venture was accepted: customer validation indicators, team assessment, market timing, or strategic thesis..."
                style={{
                  width: '100%',
                  minHeight: '110px',
                  padding: '10px',
                  fontSize: '13px',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                  color: 'var(--ink)',
                  boxSizing: 'border-box'
                }}
                disabled={approving}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setIsApprovalModalOpen(false)}
                disabled={approving}
                style={{ fontSize: '12px', padding: '8px 16px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={handleConfirmApproval}
                disabled={approving || !approvalComment.trim()}
                style={{ fontSize: '12px', padding: '8px 18px', background: 'var(--green)', borderColor: 'var(--green)' }}
              >
                {approving ? 'Recording Approval…' : '✓ Confirm Approval & Unlock Phase 02'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
