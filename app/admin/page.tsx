'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { auth, db, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';

const configuredAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_EMAILS = [
  'admin@ideacubator.in',
  'brijesh@ideacubator.in',
  'team@ideacubator.in',
  'submitidea@ideacubator.in',
  'amoginfotech@gmail.com',
  ...configuredAdminEmails
];

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
  if (t.seconds) return t.seconds * 1000;
  if (typeof t === 'number') return t;
  if (typeof t === 'string') return new Date(t).getTime() || 0;
  return 0;
};

const normalizeStatus = (status?: string): string => {
  const s = (status || '').toLowerCase().trim();
  if (!s || s === 'new' || s === 'submitted') return 'received';
  return s;
};

const formatAppDate = (app: any): string => {
  const ms = getDocTimestamp(app);
  if (!ms) return 'Recent';
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getAppDocuments = (app: any): Array<{ name: string; size?: number; downloadUrl: string }> => {
  if (!app) return [];
  if (Array.isArray(app.documents) && app.documents.length > 0) {
    return app.documents.map((d: any) => ({
      name: d.name || 'Pitch Deck',
      size: d.size,
      downloadUrl: d.downloadUrl || d.url || '#'
    }));
  }
  if (app.pitchDeck && typeof app.pitchDeck === 'object') {
    return [{
      name: app.pitchDeck.name || 'Pitch Deck',
      size: app.pitchDeck.size,
      downloadUrl: app.pitchDeck.downloadUrl || app.pitchDeck.url || '#'
    }];
  }
  return [];
};

type DrawerTab = 'founder' | 'idea' | 'chat' | 'meeting';

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [meetingAgenda, setMeetingAgenda] = useState('Founder Venture Diligence & Roadmap Review');
  const [bookingMeeting, setBookingMeeting] = useState(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      clearTimeout(timer);
      setUser(currentUser);
      setLoading(false);
    });

    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  const userEmailLower = user?.email?.toLowerCase() || '';
  const isAdmin =
    user &&
    user.email &&
    (ADMIN_EMAILS.includes(userEmailLower) ||
      userEmailLower.endsWith('@ideacubator.in') ||
      userEmailLower.includes('amoginfotech') ||
      userEmailLower.includes('brijesh'));

  const handleAdminSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked') {
        alert('Google Sign-in popup was blocked by your browser. Please allow popups for localhost:3000 to sign in.');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        alert('Sign-in error: ' + (err.message || err.code));
      }
    }
  };

  // 1. Applications Listener (Retrieves all ventures, sorting client-side across all timestamp formats)
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

  // 2. Meetings Listener
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

  // 3. Messages Listener
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

  // Action: Open Idea in Side Drawer
  const openAppDrawer = (app: any, initialTab: DrawerTab = 'founder') => {
    setSelectedApp(app);
    setDrawerTab(initialTab);
    setIsDrawerOpen(true);
    setMeetingDate(new Date().toISOString().split('T')[0]);
  };

  // Action: Trigger Mandatory Approval Modal
  const triggerApproveModal = () => {
    if (!selectedApp) return;
    setApprovalComment(selectedApp.approvalComment || '');
    setApprovalError('');
    setIsApprovalModalOpen(true);
  };

  // Action: Confirm Approval with Mandatory Comments
  const handleConfirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !user) return;
    if (!approvalComment.trim()) {
      setApprovalError('Approver comments are mandatory to approve this venture for studio co-building.');
      return;
    }

    setApproving(true);
    try {
      const comment = approvalComment.trim();
      const updates = {
        status: 'approved',
        stage: 2,
        approvalComment: comment,
        approvedBy: user.email,
        approvedAt: serverTimestamp(),
        'metadata.status': 'approved',
        'metadata.updatedAt': serverTimestamp()
      };

      await updateDoc(doc(db, 'applications', selectedApp.id), updates);

      // Post official announcement message in the chat thread
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.idea?.title || selectedApp.title || selectedApp.ideaName || 'Venture',
        senderUid: user.uid,
        senderRole: 'team',
        senderName: 'Ideacubator Investment Committee',
        content: `🎉 Congratulations! Your venture has been APPROVED for Ideacubator Studio Co-Building and advanced to Phase 02 Validation.\n\nPartner Diligence Comments:\n"${comment}"`,
        createdAt: serverTimestamp()
      });

      setSelectedApp({
        ...selectedApp,
        ...updates
      });

      setIsApprovalModalOpen(false);
      showToast('Venture approved! Promoted to Phase 02 Validation.');
    } catch (err: any) {
      alert('Failed to approve venture: ' + err.message);
    } finally {
      setApproving(false);
    }
  };

  // Action: Update Stage
  const handleUpdateStage = async (newStage: number) => {
    if (!selectedApp) return;

    // Rule: Phase 02+ requires approval
    const currentStatus = (selectedApp.status || selectedApp.metadata?.status || 'received').toLowerCase();
    if (newStage >= 2 && currentStatus !== 'approved') {
      alert('Phase 02 (Validation) and later phases require the venture to be Approved first.');
      return;
    }

    setUpdating(true);
    try {
      await updateDoc(doc(db, 'applications', selectedApp.id), {
        stage: newStage,
        'metadata.updatedAt': serverTimestamp()
      });
      setSelectedApp({ ...selectedApp, stage: newStage });
      showToast(`Venture stage updated to Phase 0${newStage}.`);
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Action: Update Status (intercept approval for mandatory comments)
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedApp) return;

    if (newStatus === 'approved') {
      triggerApproveModal();
      return;
    }

    setUpdating(true);
    try {
      const updates: any = {
        status: newStatus,
        'metadata.status': newStatus,
        'metadata.updatedAt': serverTimestamp()
      };
      // If de-approving and currently on stage >= 2, reset to stage 1
      if (newStatus !== 'approved' && (selectedApp.stage || 1) > 1) {
        updates.stage = 1;
      }

      await updateDoc(doc(db, 'applications', selectedApp.id), updates);
      setSelectedApp({
        ...selectedApp,
        ...updates
      });
      showToast(`Venture status updated to ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Action: Send Admin Chat Message
  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsg.trim() || !selectedApp || !user) return;

    setSendingMsg(true);
    try {
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.idea?.title || selectedApp.title || 'Venture',
        senderUid: user.uid,
        senderRole: 'team',
        senderName: 'Ideacubator Partner Team',
        content: adminMsg.trim(),
        createdAt: serverTimestamp(),
        read: false
      });
      setAdminMsg('');
      showToast('Message sent to founder.');
    } catch (err: any) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setSendingMsg(false);
    }
  };

  // Action: Schedule Diligence Meeting from Admin
  const handleBookAdminMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp || !meetingDate || !meetingSlot) return;

    setBookingMeeting(true);
    try {
      const founderEmail = selectedApp.founderEmail || selectedApp.email || selectedApp.profile?.email;
      const founderName = selectedApp.founderName || selectedApp.profile?.fullName || 'Founder';
      const appTitle = selectedApp.idea?.title || selectedApp.title || 'Venture Concept';

      await addDoc(collection(db, 'meetings'), {
        applicationId: selectedApp.id,
        applicationTitle: appTitle,
        applicantUid: selectedApp.applicantUid || selectedApp.userId || '',
        founderName,
        founderEmail,
        founderPhone: selectedApp.founderPhone || selectedApp.profile?.phone || '',
        date: meetingDate,
        timeSlot: meetingSlot,
        description: meetingAgenda,
        status: 'confirmed',
        createdRole: 'admin',
        createdAt: serverTimestamp()
      });

      // Post confirmation announcement in the chat thread
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: appTitle,
        senderUid: user?.uid || 'admin',
        senderRole: 'team',
        senderName: 'Ideacubator Scheduler',
        content: `📅 Partner Diligence Session scheduled for ${meetingDate} at ${meetingSlot}. Agenda: ${meetingAgenda}.`,
        createdAt: serverTimestamp()
      });

      showToast(`Strategy session confirmed for ${meetingDate}.`);
      setDrawerTab('founder');
    } catch (err: any) {
      alert('Failed to schedule meeting: ' + err.message);
    } finally {
      setBookingMeeting(false);
    }
  };

  // Filter & Sort Logic (handles both legacy and new intake schemas)
  const filteredApps = applications.filter((app) => {
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
  const countStage1 = applications.filter((a) => (a.stage || (normalizeStatus(a.status) === 'approved' ? 2 : 1)) === 1).length;
  const countStage2 = applications.filter((a) => (a.stage || (normalizeStatus(a.status) === 'approved' ? 2 : 1)) === 2).length;
  const countStage3 = applications.filter((a) => a.stage === 3).length;
  const countStage4 = applications.filter((a) => a.stage === 4).length;
  const countStage5 = applications.filter((a) => a.stage === 5).length;

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

  // Not Signed In or Unauthorized
  if (!user || !isAdmin) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: '500px', margin: '60px auto' }}>
          <div className="card pad" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '36px', color: 'var(--brown)', marginBottom: '12px' }}>🔒</div>
            <span className="eyebrow">Restricted Studio Access</span>
            <h2 style={{ fontSize: '24px', margin: '6px 0 10px' }}>Operations &amp; Diligence Console</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
              Deal flow evaluation, pipeline scoring, and due diligence are restricted to authorized review committee partners.
            </p>
            {!user ? (
              <button className="google" type="button" onClick={handleAdminSignIn} style={{ width: '100%' }}>
                Sign in with Partner Google Account
              </button>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '16px' }}>
                  Account <strong>{user.email}</strong> is not on the authorized studio partner list.
                </p>
                <button className="secondary" type="button" onClick={() => signOut(auth)}>
                  Sign Out
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

        {/* ── CLEAN HEADER (DUPLICATE EMAIL & SIGN OUT REMOVED) ── */}
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

            {/* Quick Filter Info in Sidebar */}
            <div style={{ padding: '12px 14px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)', marginTop: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '8px' }}>
                Pipeline Summary
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                <span style={{ color: 'var(--ink-2)' }}>Total Intake</span>
                <strong>{countTotal}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                <span style={{ color: 'var(--amber)' }}>Phase 01 Diligence</span>
                <strong>{countStage1}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 0' }}>
                <span style={{ color: '#2563eb' }}>Phase 02 Validated</span>
                <strong>{countStage2}</strong>
              </div>
            </div>
          </aside>

          {/* ── RIGHT MAIN CONTENT ── */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ════════════════════════════════════════════════════════
                VIEW 1: APPLICATIONS & DEAL FLOW DATA TABLE
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'ideas' && (
              <div className="card pad" style={{ padding: '20px' }}>
                {/* STANDARD TABLE TOOLBAR: FILTERS ON LEFT IN ONE ROW, SEARCH ON TOP RIGHT */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--line)',
                    marginBottom: '14px'
                  }}
                >
                  {/* LEFT: COMPACT FILTERS IN ONE HORIZONTAL ROW */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Stage Filter */}
                    <select
                      value={filterStage}
                      onChange={(e) => setFilterStage(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">Stage: All Phases</option>
                      <option value="1">Phase 01 — Diligence</option>
                      <option value="2">Phase 02 — Validation</option>
                      <option value="3">Phase 03 — MVP Build</option>
                      <option value="4">Phase 04 — Traction</option>
                      <option value="5">Phase 05 — Scale &amp; GTM</option>
                    </select>

                    {/* Status Filter */}
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="all">Status: All Statuses</option>
                      <option value="received">Received / New</option>
                      <option value="under_review">Under Review</option>
                      <option value="meeting_scheduled">Meeting Scheduled</option>
                      <option value="approved">Approved</option>
                      <option value="deferred">Deferred</option>
                    </select>

                    {/* Sort By */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <option value="date_desc">Sort: Newest First</option>
                      <option value="date_asc">Sort: Oldest First</option>
                      <option value="stage_desc">Sort: Stage (High → Low)</option>
                      <option value="stage_asc">Sort: Stage (Low → High)</option>
                      <option value="name_asc">Sort: Founder Name (A → Z)</option>
                    </select>

                    {/* Clear Filters Reset */}
                    {(filterSearch || filterStage !== 'all' || filterStatus !== 'all') && (
                      <button
                        type="button"
                        onClick={() => { setFilterSearch(''); setFilterStage('all'); setFilterStatus('all'); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brown)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '4px 8px',
                          textDecoration: 'underline'
                        }}
                      >
                        ✕ Clear Filters
                      </button>
                    )}
                  </div>

                  {/* RIGHT: SEARCH BAR POSITIONED IN TOP RIGHT OF TABLE */}
                  <div style={{ position: 'relative', width: '280px', maxWidth: '100%' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '13px',
                        color: 'var(--ink-3)',
                        pointerEvents: 'none'
                      }}
                    >
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search ventures or founders..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 32px',
                        fontSize: '12.5px',
                        borderRadius: '8px',
                        border: '1px solid var(--line)',
                        background: 'var(--paper)',
                        color: 'var(--ink)'
                      }}
                    />
                    {filterSearch && (
                      <button
                        type="button"
                        onClick={() => setFilterSearch('')}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--ink-3)',
                          fontSize: '11px',
                          padding: '2px 4px'
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* TABLE COUNTER BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontSize: '12px', color: 'var(--ink-3)' }}>
                  <span>
                    Showing <strong>{filteredApps.length}</strong> of {applications.length} ventures
                    {filterStage !== 'all' && ` · Phase 0${filterStage}`}
                    {filterStatus !== 'all' && ` · ${(STATUS_CONFIG[filterStatus] || {}).label || filterStatus}`}
                  </span>
                </div>

                {/* DATA TABLE */}
                {filteredApps.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ideas-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)' }}>
                          <th style={{ padding: '12px 14px' }}>Founder</th>
                          <th style={{ padding: '12px 14px' }}>Venture &amp; Concept</th>
                          <th style={{ padding: '12px 14px' }}>Deck</th>
                          <th style={{ padding: '12px 14px' }}>Stage</th>
                          <th style={{ padding: '12px 14px' }}>Status</th>
                          <th style={{ padding: '12px 14px' }}>Submitted</th>
                          <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredApps.map((app) => {
                          const statusKey = normalizeStatus(app.status || app.metadata?.status);
                          const statusConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.received;
                          const docs = getAppDocuments(app);
                          const docsCount = docs.length;
                          const submittedDate = formatAppDate(app);
                          const stageNum = Number(app.stage || (statusKey === 'approved' ? 2 : 1));

                          return (
                            <tr
                              key={app.id}
                              onClick={() => openAppDrawer(app, 'founder')}
                              style={{
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--line)',
                                transition: 'background 0.15s ease'
                              }}
                            >
                              {/* FOUNDER */}
                              <td style={{ padding: '12px 14px' }}>
                                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>
                                  {app.founderName || app.profile?.fullName || app.name || 'Anonymous Founder'}
                                </strong>
                                <span style={{ fontSize: '11px', color: 'var(--ink-2)' }}>
                                  {app.founderEmail || app.email || app.profile?.email || '—'}
                                </span>
                                {app.founderPhone && (
                                  <div style={{ fontSize: '10.5px', color: 'var(--ink-3)', marginTop: '2px' }}>
                                    📞 {app.founderPhone}
                                  </div>
                                )}
                              </td>

                              {/* VENTURE */}
                              <td style={{ padding: '12px 14px', maxWidth: '280px' }}>
                                <strong style={{ fontSize: '13.5px', color: 'var(--ink)', display: 'block' }}>
                                  {app.idea?.title || app.title || app.ideaName || 'Untitled Venture'}
                                </strong>
                                <p
                                  style={{
                                    margin: '2px 0 0',
                                    fontSize: '11.5px',
                                    color: 'var(--ink-3)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {app.idea?.problem || app.problem || app.ideaSummary || app.idea?.description || app.description || 'No description provided'}
                                </p>
                              </td>

                              {/* MATERIALS */}
                              <td style={{ padding: '12px 14px' }}>
                                {docsCount > 0 ? (
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                      background: 'var(--paper-2)',
                                      color: 'var(--ink)',
                                      fontWeight: 600
                                    }}
                                  >
                                    📎 {docsCount} file{docsCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '11px', color: 'var(--ink-4)' }}>—</span>
                                )}
                              </td>

                              {/* STAGE */}
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  className="badge"
                                  style={{
                                    fontSize: '11px',
                                    background: stageNum >= 2 ? 'var(--green-soft)' : 'var(--cream)',
                                    color: stageNum >= 2 ? 'var(--green)' : 'var(--brown)'
                                  }}
                                >
                                  Phase 0{stageNum}
                                </span>
                              </td>

                              {/* STATUS */}
                              <td style={{ padding: '12px 14px' }}>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: '999px',
                                    background: statusConf.bg,
                                    color: statusConf.color,
                                    textTransform: 'capitalize'
                                  }}
                                >
                                  {statusConf.label}
                                </span>
                              </td>

                              {/* SUBMITTED DATE */}
                              <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--ink-3)' }}>
                                {submittedDate}
                              </td>

                              {/* ACTIONS */}
                              <td style={{ padding: '12px 14px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                                  <button
                                    type="button"
                                    className="primary"
                                    onClick={() => openAppDrawer(app, 'founder')}
                                    style={{ fontSize: '11px', padding: '6px 12px' }}
                                  >
                                    Review ↗
                                  </button>

                                  {app.founderPhone && (
                                    <a
                                      href={`https://wa.me/${app.founderPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${app.founderName || 'Founder'}, this is Ideacubator studio team regarding your venture proposal "${app.idea?.title || app.title || 'Untitled'}".`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="icon-action-btn whatsapp-icon-btn"
                                      title="Open WhatsApp chat"
                                      style={{ display: 'inline-grid', placeItems: 'center', width: '30px', height: '30px', borderRadius: '8px', background: '#25D366', color: '#fff', textDecoration: 'none' }}
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                      </svg>
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    className="secondary"
                                    title="Open chat thread"
                                    onClick={() => openAppDrawer(app, 'chat')}
                                    style={{ fontSize: '11px', padding: '6px 10px' }}
                                  >
                                    💬
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--ink-3)' }}>
                    <p style={{ fontSize: '32px', margin: '0 0 10px' }}>🔍</p>
                    <h4 style={{ margin: '0 0 6px', color: 'var(--ink)' }}>No applications match your criteria</h4>
                    <p style={{ fontSize: '13px', margin: 0 }}>Try clearing the search query or adjusting the stage/status filters.</p>
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                VIEW 2: DILIGENCE MEETINGS LIST
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'meetings' && (
              <div className="card pad" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', margin: '0 0 4px' }}>Scheduled Diligence Sessions</h3>
                    <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)' }}>
                      Partner strategy calls and validation interviews booked across all ventures.
                    </p>
                  </div>
                  <span className="badge">{meetings.length} Total</span>
                </div>

                {meetings.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="ideas-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', fontSize: '11px', textTransform: 'uppercase', color: 'var(--ink-3)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px' }}>Date &amp; Time Slot</th>
                          <th style={{ padding: '10px 14px' }}>Venture</th>
                          <th style={{ padding: '10px 14px' }}>Founder Contact</th>
                          <th style={{ padding: '10px 14px' }}>Session Agenda</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {meetings.map((m) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '12px 14px' }}>
                              <strong>{m.date || 'TBD'}</strong>
                              <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{m.timeSlot}</div>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <strong>{m.applicationTitle || 'Venture'}</strong>
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <div>{m.founderName}</div>
                              <span style={{ fontSize: '11px', color: 'var(--ink-3)' }}>{m.founderEmail}</span>
                            </td>
                            <td style={{ padding: '12px 14px', fontSize: '12px', maxWidth: '240px' }}>
                              {m.description || m.agenda || 'General diligence review'}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '999px',
                                  background: m.status === 'confirmed' ? 'var(--green-soft)' : 'var(--amber-soft)',
                                  color: m.status === 'confirmed' ? 'var(--green)' : 'var(--amber)'
                                }}
                              >
                                {m.status || 'Scheduled'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)' }}>
                    No diligence sessions have been scheduled yet.
                  </p>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════════
                VIEW 3: FOUNDER IN-APP CHATS OVERVIEW
            ════════════════════════════════════════════════════════ */}
            {activeTab === 'chats' && (
              <div className="card pad" style={{ padding: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '18px', margin: '0 0 4px' }}>Founder Communication Streams</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-2)' }}>
                    Recent real-time chat messages across all ventures in the pipeline.
                  </p>
                </div>

                {allMessages.length > 0 ? (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {allMessages.slice(-20).reverse().map((msg) => {
                      const appMatch = applications.find((a) => a.id === msg.applicationId);
                      return (
                        <div
                          key={msg.id}
                          style={{
                            padding: '12px 16px',
                            background: 'var(--paper)',
                            borderRadius: '10px',
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
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: 'var(--ink-3)' }}
                >
                  ✕
                </button>
              </div>

              {/* ACTION STRIP (WHATSAPP, MEETINGS, CHAT) */}
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

              {/* 4 REVIEW TABS: PROFILE, IDEA, CHAT, MEETINGS */}
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
                  💡 Venture &amp; Blueprint
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('chat')}
                >
                  💬 Live Chat ({appMessages.length})
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'meeting' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('meeting')}
                >
                  📅 Meetings ({appMeetings.length})
                </button>
              </div>

              {/* DRAWER BODY */}
              <div className="drawer-body">
                {/* ════════════════════════════════════════════════════
                    TAB 1: 👤 FOUNDER COMPLETE PROFILE & DOSSIER
                ════════════════════════════════════════════════════ */}
                {drawerTab === 'founder' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* CONTACT CARD */}
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown)', marginBottom: '12px' }}>
                        Founder Identity &amp; Contact Information
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Full Name</span>
                          <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                            {selectedApp.founderName || selectedApp.profile?.fullName || 'Not provided'}
                          </strong>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Primary Email</span>
                          <span style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                            {selectedApp.founderEmail || selectedApp.email || selectedApp.profile?.email || 'Not provided'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Phone / Mobile</span>
                          <span style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                            {selectedApp.founderPhone || selectedApp.profile?.phone || 'Not provided'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Operating Location</span>
                          <span style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                            {selectedApp.founderLocation || selectedApp.profile?.location || 'India'}
                          </span>
                        </div>
                      </div>

                      {/* LinkedIn Profile */}
                      {(selectedApp.profile?.linkedIn || selectedApp.linkedIn) && (
                        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>LinkedIn Profile</span>
                          <a
                            href={selectedApp.profile?.linkedIn || selectedApp.linkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', color: 'var(--brown)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                          >
                            🔗 {selectedApp.profile?.linkedIn || selectedApp.linkedIn} ↗
                          </a>
                        </div>
                      )}
                    </div>

                    {/* PROFESSIONAL BACKGROUND & COMMITMENT */}
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '12px' }}>
                        Professional Background &amp; Founder Situation
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Current Role / Title</span>
                          <strong style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                            {selectedApp.profile?.role || selectedApp.currentRole || 'Founder'}
                          </strong>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Years of Experience</span>
                          <span style={{ fontSize: '13.5px', color: 'var(--ink)' }}>
                            {selectedApp.profile?.experienceYears ? `${selectedApp.profile.experienceYears} Years` : 'Not specified'}
                          </span>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Founder Profile Archetype</span>
                          <strong style={{ fontSize: '13.5px', textTransform: 'capitalize', color: 'var(--ink)' }}>
                            {selectedApp.founderType || selectedApp.profile?.userType || 'Professional with thesis'}
                          </strong>
                        </div>

                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Founder Commitment Level</span>
                          <span style={{ fontSize: '13.5px', color: 'var(--ink)', fontWeight: 600 }}>
                            {selectedApp.idea?.founderCommitment || selectedApp.founderCommitment || selectedApp.profile?.commitment || 'Full-time founder'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* WHY IDEACUBATOR (STUDIO SYNERGY) */}
                    {selectedApp.whyUs && (
                      <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown)', marginBottom: '8px' }}>
                          Why Ideacubator / Founder Objective
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          {selectedApp.whyUs}
                        </p>
                      </div>
                    )}

                    {/* PAST REVIEWER COMMENTS OR RATING */}
                    {(selectedApp.reviewerComments || selectedApp.rating) && (
                      <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '8px' }}>
                          Diligence Notes &amp; Scoring
                        </div>
                        {selectedApp.rating && (
                          <div style={{ marginBottom: '6px', fontSize: '12.5px' }}>
                            <span style={{ color: 'var(--ink-3)' }}>Evaluation Rating: </span>
                            <strong style={{ color: 'var(--amber)' }}>{'★'.repeat(Number(selectedApp.rating))} ({selectedApp.rating}/5)</strong>
                          </div>
                        )}
                        {selectedApp.reviewerComments && (
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink)', fontStyle: 'italic', background: 'var(--surface)', padding: '10px 12px', borderRadius: '8px' }}>
                            &ldquo;{selectedApp.reviewerComments}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* SITUATION-SPECIFIC SUBMISSION DETAILS */}
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

                {/* ════════════════════════════════════════════════════
                    TAB 2: 💡 VENTURE BLUEPRINT & ADJUDICATION
                ════════════════════════════════════════════════════ */}
                {drawerTab === 'idea' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* STAGE & STATUS ADJUDICATION CARD */}
                    <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--brown)', marginBottom: '10px' }}>
                        Studio Adjudication &amp; Stage Control
                      </div>

                      <div className="grid" style={{ marginBottom: '12px' }}>
                        {/* Status Select */}
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

                        {/* Stage Progression Selector */}
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

                      {/* REQUIREMENT HELPER: MANDATORY APPROVAL COMMENTS BUTTON */}
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
                      const appDocs = getAppDocuments(selectedApp);
                      return (
                        <div style={{ padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '8px' }}>
                            Pitch Decks &amp; Attached Files ({appDocs.length})
                          </div>
                          {appDocs.length > 0 ? (
                            <div style={{ display: 'grid', gap: '8px' }}>
                              {appDocs.map((doc, idx) => (
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
                      );
                    })()}

                    {/* VENTURE DETAILS DOSSIER */}
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div style={{ padding: '14px', background: 'var(--paper)', borderRadius: '10px' }}>
                        <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', display: 'block' }}>
                          Problem Statement &amp; Daily Friction
                        </strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          {selectedApp.idea?.problem || selectedApp.problem || 'Not specified'}
                        </p>
                      </div>

                      <div style={{ padding: '14px', background: 'var(--paper)', borderRadius: '10px' }}>
                        <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', display: 'block' }}>
                          Target Customer &amp; Beachhead Market
                        </strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          {selectedApp.idea?.customer || selectedApp.customer || 'Not specified'}
                        </p>
                      </div>

                      <div style={{ padding: '14px', background: 'var(--paper)', borderRadius: '10px' }}>
                        <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', display: 'block' }}>
                          Solution Concept &amp; Architecture
                        </strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          {selectedApp.idea?.description || selectedApp.description || selectedApp.ideaSummary || 'Not specified'}
                        </p>
                      </div>

                      <div style={{ padding: '14px', background: 'var(--paper)', borderRadius: '10px' }}>
                        <strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ink-3)', display: 'block' }}>
                          Traction &amp; Early Validation Evidence
                        </strong>
                        <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          {selectedApp.idea?.traction || selectedApp.traction || 'No traction reported yet'}
                        </p>
                      </div>

                      <div className="grid">
                        <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Monetization Model</span>
                          <strong style={{ fontSize: '13px' }}>{selectedApp.idea?.monetization || selectedApp.monetization || 'Not specified'}</strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Target Geography</span>
                          <strong style={{ fontSize: '13px' }}>{selectedApp.idea?.geography || selectedApp.geography || selectedApp.founderLocation || 'India'}</strong>
                        </div>
                      </div>

                      <div className="grid">
                        <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Team &amp; Co-founders</span>
                          <strong style={{ fontSize: '13px' }}>{selectedApp.idea?.team || selectedApp.team || 'Solo founder'}</strong>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--paper)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Support Needed</span>
                          <strong style={{ fontSize: '13px' }}>{selectedApp.idea?.supportNeeded || selectedApp.supportNeeded || 'Technical co-building'}</strong>
                        </div>
                      </div>

                      {(selectedApp.externalLink || selectedApp.idea?.externalLink) && (
                        <div style={{ padding: '12px 14px', background: 'var(--paper)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Demo / External Link (Loom, Figma, GitHub)</span>
                          <a
                            href={selectedApp.externalLink || selectedApp.idea?.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '13px', color: 'var(--brown)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
                          >
                            🔗 {selectedApp.externalLink || selectedApp.idea?.externalLink} ↗
                          </a>
                        </div>
                      )}

                      {(selectedApp.additionalContext || selectedApp.idea?.additionalContext) && (
                        <div style={{ padding: '12px 14px', background: 'var(--paper)', borderRadius: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'block' }}>Additional Notes &amp; Market Insights</span>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                            {selectedApp.additionalContext || selectedApp.idea?.additionalContext}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* AI REVIEW ASSESSMENT (IF PRESENT) */}
                    {selectedApp.aiReview && (
                      <div style={{ padding: '16px', background: 'var(--cream)', borderRadius: '12px', border: '1px solid var(--brown-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ fontSize: '12px', color: 'var(--brown)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            🤖 AI Diligence Summary
                          </strong>
                          <span className="badge" style={{ fontSize: '11px' }}>
                            Clarity: {selectedApp.aiReview.clarityScore}/10
                          </span>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5, margin: '0 0 10px' }}>
                          {selectedApp.aiReview.oneLineSummary}
                        </p>
                        {selectedApp.aiReview.nextExperiment && (
                          <div style={{ fontSize: '12px', color: 'var(--ink-2)', background: 'var(--surface)', padding: '10px 12px', borderRadius: '8px' }}>
                            <strong>Suggested Next Experiment:</strong> {selectedApp.aiReview.nextExperiment}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ════════════════════════════════════════════════════
                    TAB 3: 💬 LIVE CHAT THREAD
                ════════════════════════════════════════════════════ */}
                {drawerTab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '480px' }}>
                    <div className="chat-messages" style={{ flex: 1, padding: '10px 0', overflowY: 'auto' }}>
                      {appMessages.map((m) => {
                        const isStudio = m.senderRole === 'team';
                        return (
                          <div key={m.id} className={`chat-row ${isStudio ? 'mine' : 'theirs'}`}>
                            <div className="chat-bubble" style={{ background: isStudio ? 'var(--brown)' : 'var(--paper-2)', color: isStudio ? '#fff' : 'var(--ink)' }}>
                              {m.content || m.body}
                            </div>
                            <div className="chat-info">
                              <span>{isStudio ? 'Ideacubator Team' : m.senderName || selectedApp.founderName || 'Founder'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {appMessages.length === 0 && (
                        <p style={{ color: 'var(--ink-3)', fontSize: '13px', textAlign: 'center', margin: 'auto' }}>
                          No messages in this thread yet. Send a note to the founder below.
                        </p>
                      )}
                    </div>

                    <form onSubmit={handleSendAdminMessage} className="chat-input-bar" style={{ padding: '10px 0 0' }}>
                      <input
                        value={adminMsg}
                        onChange={(e) => setAdminMsg(e.target.value)}
                        placeholder={`Message ${selectedApp.founderName || 'founder'}...`}
                        disabled={sendingMsg}
                      />
                      <button type="submit" className="primary" disabled={sendingMsg} style={{ padding: '8px 16px' }}>
                        {sendingMsg ? 'Sending...' : 'Send'}
                      </button>
                    </form>
                  </div>
                )}

                {/* ════════════════════════════════════════════════════
                    TAB 4: 📅 DILIGENCE MEETINGS FOR THIS VENTURE
                ════════════════════════════════════════════════════ */}
                {drawerTab === 'meeting' && (
                  <div style={{ display: 'grid', gap: '16px' }}>
                    {/* EXISTING MEETINGS LIST */}
                    {appMeetings.length > 0 && (
                      <div style={{ padding: '14px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)', marginBottom: '8px' }}>
                          Scheduled Diligence Sessions ({appMeetings.length})
                        </div>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {appMeetings.map((m) => (
                            <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                              <div>
                                <strong style={{ fontSize: '13px' }}>{m.date}</strong>
                                <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginLeft: '8px' }}>{m.timeSlot}</span>
                                <div style={{ fontSize: '11.5px', color: 'var(--ink-2)', marginTop: '2px' }}>{m.description || m.agenda}</div>
                              </div>
                              <span className="badge" style={{ fontSize: '10px', background: 'var(--green-soft)', color: 'var(--green)' }}>
                                {m.status || 'Confirmed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SCHEDULE NEW MEETING FORM */}
                    <form onSubmit={handleBookAdminMeeting} style={{ display: 'grid', gap: '14px', padding: '16px', background: 'var(--paper)', borderRadius: '12px', border: '1px solid var(--line)' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px', fontSize: '14px' }}>Book Partner Strategy Session</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-2)' }}>
                          Scheduling will notify the founder and create a confirmed record in the studio schedule.
                        </p>
                      </div>

                      <div className="field">
                        <label className="label">Session Date</label>
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
                          <option value="2:00 PM – 2:45 PM IST">2:00 PM – 2:45 PM IST</option>
                          <option value="4:00 PM – 4:45 PM IST">4:00 PM – 4:45 PM IST</option>
                          <option value="5:30 PM – 6:15 PM IST">5:30 PM – 6:15 PM IST</option>
                        </select>
                      </div>

                      <div className="field">
                        <label className="label">Meeting Agenda &amp; Objective</label>
                        <textarea
                          required
                          value={meetingAgenda}
                          onChange={(e) => setMeetingAgenda(e.target.value)}
                          style={{ minHeight: '80px' }}
                          placeholder="Key diligence topics to cover with the founder..."
                        />
                      </div>

                      <button type="submit" className="primary" disabled={bookingMeeting} style={{ padding: '12px', width: '100%' }}>
                        {bookingMeeting ? 'Scheduling...' : 'Confirm Diligence Session →'}
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* DRAWER FOOTER */}
              <div className="drawer-footer">
                <button type="button" className="secondary" onClick={() => setIsDrawerOpen(false)}>
                  Close
                </button>
                {(selectedApp.status || '').toLowerCase() !== 'approved' && (
                  <button
                    type="button"
                    className="primary"
                    onClick={triggerApproveModal}
                    disabled={updating}
                  >
                    ✓ Approve Venture →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          MODAL: MANDATORY APPROVAL COMMENTS DIALOG
      ════════════════════════════════════════════════════════════════ */}
      {isApprovalModalOpen && selectedApp && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1100,
            padding: '20px'
          }}
          onClick={() => !approving && setIsApprovalModalOpen(false)}
        >
          <div
            className="card pad"
            style={{
              width: '100%',
              maxWidth: '560px',
              background: 'var(--surface)',
              borderRadius: '16px',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <span className="eyebrow" style={{ color: 'var(--green)' }}>✓ Investment Committee Action</span>
                <h3 style={{ margin: '4px 0 0', fontSize: '20px' }}>Approve Venture for Co-Building</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--ink-2)' }}>
                  Venture: <strong>{selectedApp.idea?.title || selectedApp.title || selectedApp.ideaName || 'Untitled'}</strong>
                  {' · '}Founder: <strong>{selectedApp.founderName || selectedApp.profile?.fullName || 'Founder'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => !approving && setIsApprovalModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--ink-3)' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--cream)', borderRadius: '10px', border: '1px solid var(--brown-soft)', fontSize: '12.5px', color: 'var(--ink-2)', lineHeight: 1.5, marginBottom: '16px' }}>
              <strong>Mandatory Requirement:</strong> Provide your partner diligence notes and build rationale. These comments will be recorded in the venture audit trail, advance the venture to <strong>Phase 02 Validation</strong>, and be shared with the founder in their console.
            </div>

            <form onSubmit={handleConfirmApproval}>
              <div className="field">
                <label className="label">
                  Approver Comments &amp; Diligence Rationale <span className="required">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={approvalComment}
                  onChange={(e) => {
                    setApprovalComment(e.target.value);
                    if (approvalError) setApprovalError('');
                  }}
                  placeholder="Detail why this venture is approved, strategic synergy with Ideacubator, agreed milestones for Phase 02 Validation, and studio expectations..."
                  style={{ minHeight: '120px', fontSize: '13.5px' }}
                />
                {approvalError && (
                  <p style={{ color: 'var(--red)', fontSize: '12px', margin: '6px 0 0', fontWeight: 600 }}>
                    {approvalError}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setIsApprovalModalOpen(false)}
                  disabled={approving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={approving}
                  style={{ background: 'var(--green)', borderColor: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {approving ? 'Approving Venture...' : 'Confirm Approval & Unlock Phase 02 →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
