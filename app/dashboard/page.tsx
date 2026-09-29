'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { auth, db, googleProvider } from '@/lib/firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { downloadIcsFile } from '@/lib/comms';

const WHATSAPP_NUMBER = '917676333817';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'ideas' | 'chat' | 'meetings' | 'tasks' | 'profile'>('overview');

  // Real-time Firestore collections
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Drawers
  const [drawerIdea, setDrawerIdea] = useState<any | null>(null);
  const [isIdeaDrawerOpen, setIsIdeaDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'details' | 'chat' | 'meetings'>('details');
  const [savingIdea, setSavingIdea] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState('');

  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isMeetingDrawerOpen, setIsMeetingDrawerOpen] = useState(false);

  // Meeting Form in Drawer
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingSlot, setMeetingSlot] = useState('11:00 AM – 11:45 AM IST');
  const [meetingAgenda, setMeetingAgenda] = useState('');
  const [meetingAppId, setMeetingAppId] = useState('');
  const [meetingSubmitting, setMeetingSubmitting] = useState(false);

  // Profile Form in Drawer
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    location: '',
    role: '',
    experienceYears: '',
    linkedIn: '',
    userType: 'professional'
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Auth Listener & Profile Loader
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch or create user profile doc in Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            setProfileForm({
              fullName: data.fullName || currentUser.displayName || '',
              phone: data.phone || '',
              location: data.location || 'Bangalore, India',
              role: data.role || '',
              experienceYears: data.experienceYears || '',
              linkedIn: data.linkedIn || '',
              userType: data.userType || 'professional'
            });
          } else {
            setProfileForm((p) => ({
              ...p,
              fullName: currentUser.displayName || '',
              phone: currentUser.phoneNumber || ''
            }));
          }
        } catch (e) {
          console.warn('Error fetching user profile:', e);
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time Applications Subscription
  useEffect(() => {
    if (!user) return;
    // Query applications without composite index requirement to support all records
    const q = query(collection(db, 'applications'));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const userEmail = (user.email || '').toLowerCase().trim();
        const userUid = user.uid;

        const apps: any[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          const docEmail = (data.founderEmail || data.email || data.profile?.email || '').toLowerCase().trim();
          const docUid = data.applicantUid || data.userId || data.uid;

          if (docUid === userUid || (userEmail && docEmail === userEmail)) {
            const rawStage = data.stage || (data.idea?.currentStage === 'Prototype / demo' ? 2 : 1);
            const stageNum = typeof rawStage === 'number' ? rawStage : 1;
            apps.push({
              id: d.id,
              ...data,
              title: data.idea?.title || data.ideaName || data.title || 'Untitled Working Concept',
              description: data.idea?.description || data.ideaSummary || data.description || '',
              problem: data.idea?.problem || data.problem || data.whyUs || '',
              customer: data.idea?.customer || data.customer || data.collegeName || data.companyName || '',
              stage: stageNum,
              status: data.status || data.metadata?.status || 'received',
              createdAt: data.metadata?.createdAt || data.submittedAt || data.createdAt
            });
          }
        });

        // Sort in memory by createdAt descending
        apps.sort((a, b) => {
          const tA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tB - tA;
        });

        setApplications(apps);
        if (apps.length > 0) {
          if (!selectedApp || !apps.some((a) => a.id === selectedApp.id)) {
            setSelectedApp(apps[0]);
            setMeetingAppId(apps[0].id);
          }
          // Auto-fill profile from existing application if not filled
          setProfileForm((p) => ({
            ...p,
            fullName: p.fullName || apps[0].founderName || apps[0].profile?.fullName || '',
            phone: p.phone || apps[0].founderPhone || apps[0].profile?.phone || '',
            location: p.location || apps[0].location || apps[0].profile?.location || 'Bangalore, India',
            role: p.role || apps[0].currentRole || apps[0].profile?.role || ''
          }));
        }
      },
      (err) => {
        console.warn('Applications snapshot listener error:', err);
      }
    );
    return () => unsub();
  }, [user, selectedApp]);

  // Real-time Messages Subscription for Selected Application
  useEffect(() => {
    if (!user || !selectedApp) {
      setMessages([]);
      return;
    }

    // Query messages by applicationId without composite index requirements
    const q = query(
      collection(db, 'messages'),
      where('applicationId', '==', selectedApp.id)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs: any[] = [];
        snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
        // Sort in memory by createdAt ascending
        msgs.sort((a, b) => {
          const tA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tA - tB;
        });
        setMessages(msgs);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      (err) => {
        console.warn('Messages snapshot listener error:', err);
      }
    );
    return () => unsub();
  }, [user, selectedApp]);

  // Real-time Meetings Subscription
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'meetings'),
      where('applicantUid', '==', user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const mtgs: any[] = [];
        snapshot.forEach((d) => mtgs.push({ id: d.id, ...d.data() }));
        mtgs.sort((a, b) => {
          const tA = a.createdAt?.seconds || (a.createdAt ? new Date(a.createdAt).getTime() / 1000 : 0);
          const tB = b.createdAt?.seconds || (b.createdAt ? new Date(b.createdAt).getTime() / 1000 : 0);
          return tB - tA;
        });
        setMeetings(mtgs);
      },
      (err) => {
        console.warn('Meetings snapshot listener error:', err);
      }
    );
    return () => unsub();
  }, [user]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      alert('Sign-in failed: ' + err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  // Open Drawer for Idea
  const openIdeaDrawer = (app: any, initialTab: 'details' | 'chat' | 'meetings' = 'details') => {
    setSelectedApp(app);
    setDrawerIdea(JSON.parse(JSON.stringify(app)));
    setDrawerTab(initialTab);
    setDocUploadError('');
    setIsIdeaDrawerOpen(true);
  };

  // Handle attaching a new document in the idea drawer
  const handleAttachDrawerFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user || !drawerIdea) return;
    const file = e.target.files[0];
    const validExts = /\.(pdf|doc|docx|ppt|pptx)$/i;
    if (!validExts.test(file.name)) {
      setDocUploadError('Supported file formats: PDF, DOC, DOCX, PPT, PPTX only.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setDocUploadError('File exceeds 15MB limit.');
      return;
    }

    setDocUploadError('');
    setIsUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('applicantUid', user.uid);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Upload service returned error');
      const data = await res.json();

      const newDoc = {
        name: file.name,
        size: file.size,
        storagePath: data.storagePath,
        downloadUrl: data.downloadUrl,
        uploadedAt: data.uploadedAt || new Date().toISOString()
      };

      const updatedDocs = [...(drawerIdea.documents || []), newDoc];
      setDrawerIdea((prev: any) => ({ ...prev, documents: updatedDocs }));

      // Auto-sync document attachment to Firestore immediately
      try {
        const appRef = doc(db, 'applications', drawerIdea.id);
        await updateDoc(appRef, {
          documents: updatedDocs,
          'metadata.updatedAt': serverTimestamp()
        });
        setSelectedApp((prev: any) => (prev ? { ...prev, documents: updatedDocs } : prev));
        setApplications((prev) =>
          prev.map((item) => (item.id === drawerIdea.id ? { ...item, documents: updatedDocs } : item))
        );
      } catch (syncErr) {
        console.warn('Auto-sync document attachment notice:', syncErr);
      }

      showToast(`Attached "${file.name}" to venture.`);
    } catch (err: any) {
      console.error('Drawer document upload failed:', err);
      setDocUploadError('Failed to upload file: ' + (err.message || 'Please try again.'));
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  // Handle removing a document from the idea drawer (Soft Delete: do not remove from storage)
  const handleRemoveDrawerDoc = async (index: number) => {
    if (!drawerIdea) return;
    const currentDocs = drawerIdea.documents || [];
    const targetDoc = currentDocs[index];
    if (!targetDoc) return;

    // SOFT DELETE: Mark document as deleted with timestamp, preserving file on storage/disk
    const updatedDocs = currentDocs.map((doc: any, i: number) =>
      i === index ? { ...doc, isDeleted: true, deletedAt: new Date().toISOString() } : doc
    );
    setDrawerIdea((prev: any) => ({ ...prev, documents: updatedDocs }));

    // Auto-sync document soft delete to Firestore immediately
    try {
      const appRef = doc(db, 'applications', drawerIdea.id);
      await updateDoc(appRef, {
        documents: updatedDocs,
        'metadata.updatedAt': serverTimestamp()
      });
      setSelectedApp((prev: any) => (prev ? { ...prev, documents: updatedDocs } : prev));
      setApplications((prev) =>
        prev.map((item) => (item.id === drawerIdea.id ? { ...item, documents: updatedDocs } : item))
      );
    } catch (syncErr) {
      console.warn('Auto-sync document removal notice:', syncErr);
    }

    showToast('Document removed from venture view (preserved securely in studio storage).');
  };

  // Save Idea Edits (Persists across all tabs: details, materials, links, notes)
  const handleSaveDrawerIdea = async () => {
    if (!drawerIdea || !drawerIdea.id) return;
    setSavingIdea(true);
    try {
      const appRef = doc(db, 'applications', drawerIdea.id);
      const newTitle = drawerIdea.idea?.title || drawerIdea.title || drawerIdea.ideaName || 'Untitled Venture';
      const newDesc = drawerIdea.idea?.description || drawerIdea.description || drawerIdea.ideaSummary || '';
      const newProb = drawerIdea.idea?.problem || drawerIdea.problem || '';
      const newCust = drawerIdea.idea?.customer || drawerIdea.customer || '';
      const newStageStr = drawerIdea.idea?.currentStage || drawerIdea.currentStage || 'Idea only';
      const newMonetization = drawerIdea.idea?.monetization || drawerIdea.monetization || '';
      const newTraction = drawerIdea.idea?.traction || drawerIdea.traction || '';
      const newGeography = drawerIdea.idea?.geography || drawerIdea.geography || '';
      const newTeam = drawerIdea.idea?.team || drawerIdea.team || '';
      const newCommitment = drawerIdea.idea?.founderCommitment || drawerIdea.founderCommitment || '';
      const newSupport = drawerIdea.idea?.supportNeeded || drawerIdea.supportNeeded || '';
      const newExternalLink = drawerIdea.externalLink || drawerIdea.idea?.externalLink || '';
      const newAdditionalContext = drawerIdea.additionalContext || drawerIdea.idea?.additionalContext || '';
      const newDocs = Array.isArray(drawerIdea.documents) ? drawerIdea.documents : [];

      const updates: any = {
        title: newTitle,
        ideaName: newTitle,
        description: newDesc,
        ideaSummary: newDesc,
        problem: newProb,
        customer: newCust,
        externalLink: newExternalLink,
        additionalContext: newAdditionalContext,
        documents: newDocs,
        idea: {
          ...(drawerIdea.idea || {}),
          title: newTitle,
          description: newDesc,
          problem: newProb,
          customer: newCust,
          currentStage: newStageStr,
          monetization: newMonetization,
          traction: newTraction,
          geography: newGeography,
          team: newTeam,
          founderCommitment: newCommitment,
          supportNeeded: newSupport,
          externalLink: newExternalLink,
          additionalContext: newAdditionalContext
        },
        'metadata.updatedAt': serverTimestamp()
      };

      await updateDoc(appRef, updates);

      // Immediately update local application & selectedApp states
      setSelectedApp((prev: any) => (prev ? { ...prev, ...updates } : prev));
      setApplications((prev) =>
        prev.map((item) => (item.id === drawerIdea.id ? { ...item, ...updates } : item))
      );

      showToast('All venture details, documents, and notes saved successfully.');
      setIsIdeaDrawerOpen(false);
    } catch (err: any) {
      console.error('Failed to update idea in Firestore:', err);
      alert('Failed to update idea: ' + (err.message || 'Please check your connection and try again.'));
    } finally {
      setSavingIdea(false);
    }
  };

  // Send Real-Time Chat Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !selectedApp) return;

    setChatSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        applicationTitle: selectedApp.idea?.title || selectedApp.title || 'Venture',
        senderUid: user.uid,
        senderName: user.displayName || 'Founder',
        senderRole: 'founder',
        content: newMessage.trim(),
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (err: any) {
      alert('Failed to send message: ' + err.message);
    } finally {
      setChatSending(false);
    }
  };

  // Save Profile in Drawer
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          ...profileForm,
          email: user.email,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      showToast('Profile saved successfully.');
      setIsProfileDrawerOpen(false);
    } catch (err: any) {
      alert('Failed to save profile: ' + err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // In-App Calendar States & Navigation
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [inspectedMeeting, setInspectedMeeting] = useState<any | null>(null);

  const nextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  };
  const prevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  };
  const goToToday = () => {
    setCalendarMonth(new Date());
  };

  // In-App Scheduler: Book Meeting & Notify Ideacubator Mailbox
  const handleBookMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !meetingDate) return;

    setMeetingSubmitting(true);
    try {
      const targetApp = applications.find((a) => a.id === meetingAppId) || selectedApp || applications[0];
      const newMtg = {
        applicantUid: user.uid,
        founderName: profileForm.fullName || user.displayName || 'Founder',
        founderEmail: user.email,
        founderPhone: profileForm.phone || '',
        applicationId: targetApp?.id || 'general',
        applicationTitle: targetApp?.idea?.title || targetApp?.title || 'General Strategy',
        title: `Strategy Review: ${targetApp?.idea?.title || 'Ideacubator Diligence'}`,
        description: meetingAgenda || 'Founder deep-dive session with Ideacubator studio partners.',
        date: meetingDate,
        time: meetingSlot,
        location: 'Ideacubator In-App Session Room',
        status: 'confirmed',
        mailboxRecipient: 'team@ideacubator.in',
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'meetings'), newMtg);

      // 1. Dispatch record to studio mailbox collection
      await addDoc(collection(db, 'mailbox'), {
        meetingId: docRef.id,
        type: 'meeting_scheduled',
        to: 'team@ideacubator.in',
        secondary: 'submitidea@ideacubator.in',
        from: user.email,
        applicantUid: user.uid,
        founderName: newMtg.founderName,
        founderEmail: user.email,
        founderPhone: newMtg.founderPhone,
        applicationTitle: newMtg.applicationTitle,
        date: meetingDate,
        timeSlot: meetingSlot,
        agenda: newMtg.description,
        status: 'unread',
        createdAt: serverTimestamp()
      });

      // 2. Post automated announcement to real-time chat
      if (targetApp?.id) {
        await addDoc(collection(db, 'messages'), {
          applicationId: targetApp.id,
          applicationTitle: targetApp?.idea?.title || targetApp?.title || 'Venture',
          senderUid: 'system',
          senderName: 'Ideacubator Scheduler',
          senderRole: 'team',
          content: `📅 Partner Strategy Session booked for ${meetingDate} at ${meetingSlot}. Notification has been dispatched to Ideacubator mailbox (team@ideacubator.in).`,
          createdAt: serverTimestamp()
        });
      }

      // 3. Trigger server notification endpoint for studio mailbox
      try {
        await fetch('/api/notify-meeting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            meetingId: docRef.id,
            founderName: newMtg.founderName,
            founderEmail: user.email,
            founderPhone: newMtg.founderPhone,
            applicationTitle: newMtg.applicationTitle,
            date: meetingDate,
            timeSlot: meetingSlot,
            agenda: meetingAgenda
          })
        });
      } catch (e) {
        console.warn('Mailbox API dispatch notification:', e);
      }

      showToast('Session scheduled! Notification sent to Ideacubator mailbox (team@ideacubator.in).');
      setIsMeetingDrawerOpen(false);
      setMeetingAgenda('');
      setActiveTab('meetings');
    } catch (err: any) {
      alert('Failed to book meeting: ' + err.message);
    } finally {
      setMeetingSubmitting(false);
    }
  };

  // Direct WhatsApp Launch
  const openWhatsAppIdea = (ideaItem: any) => {
    const title = ideaItem?.idea?.title || ideaItem?.title || 'Venture';
    const text = encodeURIComponent(
      `Hello Ideacubator, I would like to discuss my idea "${title}" (ID: ${ideaItem?.id?.slice(0, 6)}).`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <main className="page">
        <div className="container" style={{ textAlign: 'center', padding: '100px 20px' }}>
          <div className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px' }}></div>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px' }}>Loading your founder console…</p>
        </div>
      </main>
    );
  }

  // Not Signed In
  if (!user) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: '520px', margin: '40px auto' }}>
          <div className="card pad" style={{ textAlign: 'center' }}>
            <div className="auth-icon" style={{ margin: '0 auto 16px' }}>⌁</div>
            <div className="eyebrow">Private Founder Workspace</div>
            <h1 className="title" style={{ fontSize: '28px', margin: '8px 0 10px' }}>Sign in to start.</h1>
            <p className="subtitle" style={{ fontSize: '14px', marginBottom: '24px' }}>
              Your applications, documents, conversations, meetings, and milestone updates will stay securely organized in your private workspace.
            </p>
            <button className="google" type="button" onClick={handleGoogleSignIn} style={{ margin: '0 auto' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>
            <div className="help" style={{ marginTop: '16px' }}>
              Already submitted? Use the same Google account to access your ideas.
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Active Applications Count & Metrics
  const activeReviewCount = applications.filter((a) => (a.stage || 1) >= 1).length;
  const activeMeetingCount = meetings.filter((m) => m.status === 'confirmed').length;

  return (
    <main className="page">
      <div className="container">
        {/* Toast Feedback */}
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
              zIndex: 1003
            }}
          >
            {toastMessage}
          </div>
        )}

        {/* ── WORKSPACE HEADER ── */}
        <div className="page-head" style={{ marginBottom: '24px' }}>
          <div>
            <div className="eyebrow">Private Founder Workspace</div>
            <h1 className="title" style={{ fontSize: '24px', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
              Ideacubator Console
            </h1>
          </div>
        </div>

        {/* ── 2-COLUMN SHELL: SIDEBAR + CONTENT ── */}
        <div className="shell">
          {/* SIDEBAR: WHATSAPP, IN-APP CHAT, SCHEDULE MEETING */}
          <aside className="sidebar">
            <div style={{ marginBottom: '12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-3)' }}>
              Founder Navigation
            </div>

            <button
              type="button"
              className={`side-link ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              🗂️ Ideas &amp; Applications ({applications.length})
            </button>

            <button
              type="button"
              className={`side-link ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              💬 In-App Chat {messages.length > 0 && `(${messages.length})`}
            </button>

            <button
              type="button"
              className={`side-link ${activeTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setActiveTab('meetings')}
              style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              📅 Schedule Meeting ({meetings.length})
            </button>

            <div className="divider" style={{ margin: '16px 0' }} />

            {/* Studio Direct Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setMeetingDate(new Date().toISOString().split('T')[0]);
                  setIsMeetingDrawerOpen(true);
                }}
                style={{ fontSize: '12px', padding: '9px 12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <span>📅</span> Book Diligence Call
              </button>
              <Link
                href="/submit-idea"
                className="primary"
                style={{ fontSize: '12px', padding: '9px 12px', textAlign: 'center', width: '100%' }}
              >
                ＋ Submit Another Idea
              </Link>
            </div>
          </aside>

          {/* MAIN WORKSPACE CONTENT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* ── TAB 1: OVERVIEW ── */}
            {activeTab === 'overview' && (
              <>
                {/* 4 DYNAMIC SUMMARY METRIC CARDS (FITS IN ONE ROW) */}
                <div className="stats">
                  <div className="stat">
                    <strong>{applications.length}</strong>
                    <span>Total Submitted Ideas</span>
                  </div>
                  <div className="stat">
                    <strong style={{ color: 'var(--brown)' }}>{activeReviewCount}</strong>
                    <span>Under Active Diligence</span>
                  </div>
                  <div className="stat">
                    <strong style={{ color: 'var(--green)' }}>{activeMeetingCount}</strong>
                    <span>Scheduled Partner Sessions</span>
                  </div>
                  <div className="stat">
                    <strong>{messages.length}</strong>
                    <span>Real-Time Chat Messages</span>
                  </div>
                </div>

                {/* VENTURES PORTFOLIO TABLE (DIRECT DISPLAY - NO BANNER CARD) */}
                <div className="card pad">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', margin: '0 0 2px' }}>My Ideas &amp; Applications</h3>
                      <span className="help">Click any row or action to open venture details, chat, or scheduling</span>
                    </div>
                    <Link href="/submit-idea" className="primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                      ＋ Submit New Idea
                    </Link>
                  </div>

                  {applications.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="ideas-table">
                        <thead>
                          <tr>
                            <th>Working Title</th>
                            <th>Current Stage</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((app) => (
                            <tr
                              key={app.id}
                              onClick={() => openIdeaDrawer(app)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <strong>{app.idea?.title || app.title || 'Untitled Venture'}</strong>
                                <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '2px' }}>
                                  {app.idea?.customer || 'Target customer pending'}
                                </div>
                              </td>
                              <td>
                                <span className="badge">Phase {app.stage || 1}</span>
                              </td>
                              <td>
                                <span style={{ textTransform: 'capitalize', fontSize: '12px', fontWeight: 600 }}>
                                  {app.status || 'Received'}
                                </span>
                              </td>
                              <td style={{ color: 'var(--ink-3)', fontSize: '12px' }}>
                                {app.metadata?.createdAt?.seconds
                                  ? new Date(app.metadata.createdAt.seconds * 1000).toLocaleDateString()
                                  : 'Recent'}
                              </td>
                              <td>
                                <div className="icon-action-group" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="icon-action-btn primary-icon-btn"
                                    title="View & Edit Venture Details"
                                    onClick={() => openIdeaDrawer(app, 'details')}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                      <polyline points="15 3 21 3 21 9"></polyline>
                                      <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action-btn"
                                    title="In-App Live Chat"
                                    onClick={() => {
                                      setSelectedApp(app);
                                      setActiveTab('chat');
                                    }}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action-btn"
                                    title="Schedule Strategy Session"
                                    onClick={() => {
                                      setMeetingAppId(app.id);
                                      setMeetingDate(new Date().toISOString().split('T')[0]);
                                      setIsMeetingDrawerOpen(true);
                                    }}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                      <line x1="16" y1="2" x2="16" y2="6"></line>
                                      <line x1="8" y1="2" x2="8" y2="6"></line>
                                      <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-action-btn whatsapp-icon-btn"
                                    title="Chat on WhatsApp"
                                    onClick={() => openWhatsAppIdea(app)}
                                  >
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink-3)' }}>
                      <p style={{ fontSize: '32px', margin: '0 0 10px' }}>💡</p>
                      <p style={{ fontSize: '14px', margin: '0 0 16px' }}>You haven&apos;t submitted a startup concept yet.</p>
                      <Link href="/submit-idea" className="primary" style={{ padding: '10px 20px' }}>
                        Submit your first idea →
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── TAB 2: IDEAS & ACTIONS ── */}
            {activeTab === 'ideas' && (
              <div className="card pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', margin: '0 0 4px' }}>Venture Portfolio</h2>
                    <p style={{ color: 'var(--ink-2)', fontSize: '13px', margin: 0 }}>
                      Click on any venture to edit details, open live chat, or request a meeting.
                    </p>
                  </div>
                  <Link href="/submit-idea" className="primary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                    ＋ Submit Another Idea
                  </Link>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="card"
                      style={{ padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onClick={() => openIdeaDrawer(app)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span className="badge">Phase {app.stage || 1}</span>
                            <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                              ID: {app.id.slice(0, 8)}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '18px', margin: '0 0 6px' }}>
                            {app.idea?.title || app.title || 'Untitled Working Concept'}
                          </h3>
                          <p style={{ color: 'var(--ink-2)', fontSize: '13px', maxWidth: '600px', margin: 0 }}>
                            {app.idea?.description || app.description || 'No description provided.'}
                          </p>
                        </div>

                        <div className="icon-action-group" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="icon-action-btn primary-icon-btn"
                            title="View & Edit Venture Details"
                            onClick={() => openIdeaDrawer(app, 'details')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="In-App Live Chat"
                            onClick={() => {
                              setSelectedApp(app);
                              setActiveTab('chat');
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn"
                            title="Schedule Strategy Session"
                            onClick={() => {
                              setMeetingAppId(app.id);
                              setMeetingDate(new Date().toISOString().split('T')[0]);
                              setIsMeetingDrawerOpen(true);
                            }}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="16" y1="2" x2="16" y2="6"></line>
                              <line x1="8" y1="2" x2="8" y2="6"></line>
                              <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="icon-action-btn whatsapp-icon-btn"
                            title="Chat on WhatsApp"
                            onClick={() => openWhatsAppIdea(app)}
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 3: REAL-TIME CHAT APP ── */}
            {activeTab === 'chat' && (
              <div className="chat-app-shell">
                {/* THREAD LIST */}
                <div className="chat-sidebar">
                  <div className="chat-sidebar-head">Venture Chat Channels</div>
                  <div className="chat-thread-list">
                    {applications.map((app) => (
                      <div
                        key={app.id}
                        className={`chat-thread-item ${selectedApp?.id === app.id ? 'active' : ''}`}
                        onClick={() => setSelectedApp(app)}
                      >
                        <div className="chat-thread-title">{app.idea?.title || app.title || 'Venture'}</div>
                        <div className="chat-thread-meta">Phase {app.stage || 1} · {app.status || 'Received'}</div>
                      </div>
                    ))}
                    {applications.length === 0 && (
                      <div style={{ padding: '16px', color: 'var(--ink-3)', fontSize: '12px' }}>
                        No venture channels available.
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTIVE CHAT WINDOW */}
                <div className="chat-main">
                  <div className="chat-main-header">
                    <div>
                      <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>
                        {selectedApp?.idea?.title || selectedApp?.title || 'Studio Diligence Chat'}
                      </strong>
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
                        Direct two-way channel with Ideacubator partners &amp; engineering lead
                      </div>
                    </div>

                    <button
                      type="button"
                      className="drawer-action-btn whatsapp-action"
                      onClick={() => openWhatsAppIdea(selectedApp)}
                    >
                      Chat on WhatsApp instead
                    </button>
                  </div>

                  {/* CHAT MESSAGES STREAM */}
                  <div className="chat-messages">
                    {messages.length === 0 ? (
                      <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--ink-3)', fontSize: '13px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '24px' }}>💬</p>
                        No chat history yet for this venture.<br />
                        Send a message below to start your diligence conversation.
                      </div>
                    ) : (
                      messages.map((m) => {
                        const isMine = m.senderRole === 'founder';
                        return (
                          <div key={m.id} className={`chat-row ${isMine ? 'mine' : 'theirs'}`}>
                            <div className="chat-bubble">{m.content}</div>
                            <div className="chat-info">
                              <span>{isMine ? 'You' : m.senderName || 'Ideacubator Partner'}</span>
                              <span>·</span>
                              <span>
                                {m.createdAt?.seconds
                                  ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Just now'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* INPUT BAR */}
                  <form onSubmit={handleSendMessage} className="chat-input-bar">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message to the studio engineering team..."
                      disabled={!selectedApp || chatSending}
                    />
                    <button
                      type="submit"
                      className="primary"
                      disabled={!selectedApp || chatSending || !newMessage.trim()}
                      style={{ padding: '10px 18px', fontSize: '13px' }}
                    >
                      {chatSending ? 'Sending…' : 'Send →'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── TAB 4: MEETINGS & IN-APP CALENDAR GRID ── */}
            {activeTab === 'meetings' && (
              <div className="card pad inapp-calendar-container">
                {/* CALENDAR TOPBAR */}
                <div className="calendar-topbar">
                  <div>
                    <h2 style={{ fontSize: '20px', margin: '0 0 4px' }}>In-App Strategy Calendar</h2>
                    <p style={{ color: 'var(--ink-2)', fontSize: '13px', margin: 0 }}>
                      Interactive studio schedule. All booked sessions automatically notify the Ideacubator mailbox.
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="calendar-nav-wrap">
                      <button type="button" className="calendar-arrow-btn" onClick={prevMonth} title="Previous Month">‹</button>
                      <span className="calendar-month-heading">
                        {[
                          'January', 'February', 'March', 'April', 'May', 'June',
                          'July', 'August', 'September', 'October', 'November', 'December'
                        ][calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                      </span>
                      <button type="button" className="calendar-arrow-btn" onClick={nextMonth} title="Next Month">›</button>
                      <button type="button" className="calendar-today-btn" onClick={goToToday}>Today</button>
                    </div>

                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        const now = new Date();
                        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                        setMeetingDate(todayStr);
                        setIsMeetingDrawerOpen(true);
                      }}
                      style={{ padding: '8px 16px', fontSize: '12px' }}
                    >
                      ＋ Schedule Session
                    </button>
                  </div>
                </div>

                {/* CALENDAR BOARD */}
                {(() => {
                  const calYear = calendarMonth.getFullYear();
                  const calMonth = calendarMonth.getMonth();
                  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
                  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                  const daysInPrev = new Date(calYear, calMonth, 0).getDate();

                  const now = new Date();
                  const todayFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                  const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

                  // Leading days from previous month
                  for (let i = firstDayIndex - 1; i >= 0; i--) {
                    const d = daysInPrev - i;
                    const pDate = new Date(calYear, calMonth - 1, d);
                    const dateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    cells.push({ dateStr, dayNum: d, isCurrentMonth: false, isToday: dateStr === todayFormatted });
                  }

                  // Days of current month
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    cells.push({ dateStr, dayNum: d, isCurrentMonth: true, isToday: dateStr === todayFormatted });
                  }

                  // Trailing padding to make full weeks
                  const totalCells = Math.ceil(cells.length / 7) * 7;
                  const trailing = totalCells - cells.length;
                  for (let d = 1; d <= trailing; d++) {
                    const nDate = new Date(calYear, calMonth + 1, d);
                    const dateStr = `${nDate.getFullYear()}-${String(nDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    cells.push({ dateStr, dayNum: d, isCurrentMonth: false, isToday: dateStr === todayFormatted });
                  }

                  return (
                    <div className="calendar-board">
                      {/* WEEKDAYS HEADER */}
                      <div className="calendar-weekdays-row">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((wd) => (
                          <div key={wd} className="calendar-weekday-title">{wd}</div>
                        ))}
                      </div>

                      {/* DAYS GRID */}
                      <div className="calendar-cells-grid">
                        {cells.map((cell, idx) => {
                          const dayMeetings = meetings.filter((m) => m.date === cell.dateStr);

                          return (
                            <div
                              key={idx}
                              className={`calendar-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'is-today' : ''}`}
                              onClick={() => {
                                setMeetingDate(cell.dateStr);
                                setIsMeetingDrawerOpen(true);
                              }}
                            >
                              <div className="calendar-cell-header">
                                <span className="calendar-date-number">{cell.dayNum}</span>
                                <span className="calendar-plus-hint">＋</span>
                              </div>

                              <div className="calendar-cell-events">
                                {dayMeetings.map((mtg) => (
                                  <button
                                    key={mtg.id}
                                    type="button"
                                    className="calendar-event-chip"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInspectedMeeting(mtg);
                                    }}
                                    title={`${mtg.title} (${mtg.time})`}
                                  >
                                    🕒 {mtg.time?.split('–')[0]?.trim()} · {mtg.applicationTitle || mtg.title}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* INSPECTED MEETING DETAIL DRAWER/CARD */}
                {inspectedMeeting && (
                  <div className="calendar-meeting-detail-card">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>
                          {inspectedMeeting.status || 'Confirmed'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                          Studio Diligence Session
                        </span>
                      </div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '16px', color: 'var(--ink)' }}>
                        {inspectedMeeting.title}
                      </h4>
                      <div style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '4px' }}>
                        📅 <strong>{inspectedMeeting.date}</strong> at <strong>{inspectedMeeting.time}</strong> · 📍 In-App Session Room
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--ink-3)', margin: 0 }}>
                        Agenda: {inspectedMeeting.description || 'General strategy & diligence review.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => {
                          const target = applications.find((a) => a.id === inspectedMeeting.applicationId);
                          if (target) setSelectedApp(target);
                          setActiveTab('chat');
                        }}
                      >
                        💬 Open In-App Chat
                      </button>
                      <button
                        type="button"
                        className="table-action-btn whatsapp-action"
                        style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                        onClick={() => {
                          const text = encodeURIComponent(
                            `Hello Ideacubator, regarding our meeting on ${inspectedMeeting.date} (${inspectedMeeting.time}) for ${inspectedMeeting.applicationTitle}...`
                          );
                          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank', 'noopener,noreferrer');
                        }}
                      >
                        📱 WhatsApp Studio
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setInspectedMeeting(null)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 5: DILIGENCE MILESTONES ── */}
            {activeTab === 'tasks' && (
              <div className="card pad">
                <h2 style={{ fontSize: '20px', margin: '0 0 6px' }}>5-Stage Diligence Checklist</h2>
                <p style={{ color: 'var(--ink-2)', fontSize: '13px', marginBottom: '24px' }}>
                  Our structured venture framework from day zero intake through institutional scale.
                </p>

                <div style={{ display: 'grid', gap: '16px' }}>
                  {[
                    { phase: 'Phase 01', title: 'Intake & Problem Alignment', desc: 'Clarify customer pain, evaluate willingness-to-pay, and establish technical feasibility.', done: true },
                    { phase: 'Phase 02', title: 'Architecture & MVP Scope', desc: 'Define minimal viable product specification, data models, and user journeys.', done: (selectedApp?.stage || 1) >= 2 },
                    { phase: 'Phase 03', title: 'Production Engineering Sprint', desc: 'Full-stack software build, AI pipeline integration, and infrastructure provisioning.', done: (selectedApp?.stage || 1) >= 3 },
                    { phase: 'Phase 04', title: 'Go-to-Market & Initial Traction', desc: 'First customer deployment, analytics tracking, and unit economics validation.', done: (selectedApp?.stage || 1) >= 4 },
                    { phase: 'Phase 05', title: 'Capital Readiness & Scale', desc: 'Investor data room preparation, financial models, and angel/VC syndication.', done: (selectedApp?.stage || 1) >= 5 }
                  ].map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'flex-start',
                        padding: '14px',
                        borderRadius: '12px',
                        background: m.done ? 'var(--cream)' : 'var(--paper)',
                        border: '1px solid var(--line)'
                      }}
                    >
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: m.done ? 'var(--green)' : 'var(--line)',
                          color: '#fff',
                          display: 'grid',
                          placeItems: 'center',
                          fontSize: '14px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}
                      >
                        {m.done ? '✓' : idx + 1}
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brown)', textTransform: 'uppercase' }}>
                          {m.phase}
                        </div>
                        <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{m.title}</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ink-2)' }}>{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB 6: FOUNDER PROFILE ── */}
            {activeTab === 'profile' && (
              <div className="card pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '20px', margin: 0 }}>Founder Profile Details</h2>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setIsProfileDrawerOpen(true)}
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Edit Profile Details →
                  </button>
                </div>

                <div className="grid">
                  <div className="field">
                    <label className="label">Full Name</label>
                    <input disabled value={profileForm.fullName || user.displayName || 'Founder'} />
                  </div>
                  <div className="field">
                    <label className="label">Email</label>
                    <input disabled value={user.email || ''} />
                  </div>
                  <div className="field">
                    <label className="label">Phone / WhatsApp</label>
                    <input disabled value={profileForm.phone || 'Not specified'} />
                  </div>
                  <div className="field">
                    <label className="label">Location</label>
                    <input disabled value={profileForm.location || 'Bangalore, India'} />
                  </div>
                  <div className="field">
                    <label className="label">Role / Title</label>
                    <input disabled value={profileForm.role || 'Not specified'} />
                  </div>
                  <div className="field">
                    <label className="label">Years of Experience</label>
                    <input disabled value={profileForm.experienceYears || '0'} />
                  </div>
                  <div className="field full">
                    <label className="label">LinkedIn Profile</label>
                    <input disabled value={profileForm.linkedIn || 'Not specified'} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SLIDE-OVER DRAWER 1: IDEA DETAILS, CHAT, & ACTIONS
      ════════════════════════════════════════════════════════════════ */}
      <div className={`drawer-backdrop ${isIdeaDrawerOpen ? 'open' : ''}`} onClick={() => setIsIdeaDrawerOpen(false)}>
        <div className="slide-drawer" onClick={(e) => e.stopPropagation()}>
          {drawerIdea && (
            <>
              {/* DRAWER HEADER */}
              <div className="drawer-header">
                <div>
                  <span className="badge" style={{ marginBottom: '4px' }}>Phase {drawerIdea.stage || 1}</span>
                  <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--ink)' }}>
                    {drawerIdea.idea?.title || drawerIdea.title || 'Untitled Working Concept'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIdeaDrawerOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--ink-3)' }}
                >
                  ✕
                </button>
              </div>

              {/* ACTION STRIP (WHATSAPP, MEETINGS, CHAT) */}
              <div className="drawer-action-strip">
                <button
                  type="button"
                  className="drawer-action-btn whatsapp-action"
                  onClick={() => openWhatsAppIdea(drawerIdea)}
                >
                  💬 WhatsApp (+91 7676333817)
                </button>
                <button
                  type="button"
                  className="drawer-action-btn"
                  onClick={() => setDrawerTab('chat')}
                >
                  Real-time Chat
                </button>
                <button
                  type="button"
                  className="drawer-action-btn"
                  onClick={() => {
                    setMeetingAppId(drawerIdea.id);
                    setIsMeetingDrawerOpen(true);
                  }}
                >
                  📅 Book Diligence Call
                </button>
              </div>

              {/* TABS INSIDE DRAWER */}
              <div className="drawer-tab-nav">
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'details' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('details')}
                >
                  Venture Details &amp; Edit
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('chat')}
                >
                  Live Chat Thread
                </button>
                <button
                  type="button"
                  className={`drawer-tab-btn ${drawerTab === 'meetings' ? 'active' : ''}`}
                  onClick={() => setDrawerTab('meetings')}
                >
                  Materials &amp; Decks
                </button>
              </div>

              {/* DRAWER BODY */}
              <div className="drawer-body">
                {drawerTab === 'details' && (
                  <div style={{ display: 'grid', gap: '14px' }}>
                    {/* 1. VENTURE WORKING TITLE */}
                    <div className="field">
                      <label className="label">Venture Working Title <span className="required">*</span></label>
                      <input
                        value={drawerIdea.idea?.title || drawerIdea.title || drawerIdea.ideaName || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            title: e.target.value,
                            ideaName: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), title: e.target.value }
                          })
                        }
                        placeholder="e.g. HealthBridge AI"
                      />
                    </div>

                    {/* 2. SOLUTION & PRODUCT CONCEPT */}
                    <div className="field">
                      <label className="label">Solution &amp; Core Concept <span className="required">*</span></label>
                      <textarea
                        value={drawerIdea.idea?.description || drawerIdea.description || drawerIdea.ideaSummary || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            description: e.target.value,
                            ideaSummary: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), description: e.target.value }
                          })
                        }
                        style={{ minHeight: '90px' }}
                        placeholder="What are you building? Describe the core product, workflow, and technology..."
                      />
                    </div>

                    {/* 3. PROBLEM STATEMENT */}
                    <div className="field">
                      <label className="label">Problem Statement &amp; Daily Friction</label>
                      <textarea
                        value={drawerIdea.idea?.problem || drawerIdea.problem || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            problem: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), problem: e.target.value }
                          })
                        }
                        style={{ minHeight: '80px' }}
                        placeholder="What is painful, slow, expensive, or broken in the industry today?"
                      />
                    </div>

                    {/* 4. TARGET CUSTOMER & STAGE */}
                    <div className="grid">
                      <div className="field">
                        <label className="label">Target Customer / Beachhead Market</label>
                        <input
                          value={drawerIdea.idea?.customer || drawerIdea.customer || ''}
                          onChange={(e) =>
                            setDrawerIdea({
                              ...drawerIdea,
                              customer: e.target.value,
                              idea: { ...(drawerIdea.idea || {}), customer: e.target.value }
                            })
                          }
                          placeholder="e.g. Mid-market healthcare clinics"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Current Development Stage</label>
                        <select
                          value={drawerIdea.idea?.currentStage || drawerIdea.currentStage || 'Idea only'}
                          onChange={(e) =>
                            setDrawerIdea({
                              ...drawerIdea,
                              currentStage: e.target.value,
                              idea: { ...(drawerIdea.idea || {}), currentStage: e.target.value }
                            })
                          }
                        >
                          <option value="Idea only">Idea only</option>
                          <option value="Problem validated">Problem validated</option>
                          <option value="Prototype / demo">Prototype / demo</option>
                          <option value="MVP / product built">MVP / product built</option>
                          <option value="Early users">Early users</option>
                          <option value="Revenue">Revenue</option>
                          <option value="Scaling">Scaling</option>
                        </select>
                      </div>
                    </div>

                    {/* 5. TRACTION & EVIDENCE */}
                    <div className="field">
                      <label className="label">Traction &amp; Early Validation Evidence</label>
                      <textarea
                        value={drawerIdea.idea?.traction || drawerIdea.traction || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            traction: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), traction: e.target.value }
                          })
                        }
                        style={{ minHeight: '70px' }}
                        placeholder="Letters of intent, waitlist signups, pilot users, customer interview findings, or ARR..."
                      />
                    </div>

                    {/* 6. MONETIZATION & GEOGRAPHY */}
                    <div className="grid">
                      <div className="field">
                        <label className="label">Monetization &amp; Business Model</label>
                        <input
                          value={drawerIdea.idea?.monetization || drawerIdea.monetization || ''}
                          onChange={(e) =>
                            setDrawerIdea({
                              ...drawerIdea,
                              monetization: e.target.value,
                              idea: { ...(drawerIdea.idea || {}), monetization: e.target.value }
                            })
                          }
                          placeholder="e.g. B2B SaaS $499/mo, 1.5% take rate"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Target Market Geography</label>
                        <input
                          value={drawerIdea.idea?.geography || drawerIdea.geography || ''}
                          onChange={(e) =>
                            setDrawerIdea({
                              ...drawerIdea,
                              geography: e.target.value,
                              idea: { ...(drawerIdea.idea || {}), geography: e.target.value }
                            })
                          }
                          placeholder="e.g. India &amp; North America"
                        />
                      </div>
                    </div>

                    {/* 7. TEAM STRUCTURE & COMMITMENT */}
                    <div className="grid">
                      <div className="field">
                        <label className="label">Team Structure &amp; Co-founders</label>
                        <input
                          value={drawerIdea.idea?.team || drawerIdea.team || ''}
                          onChange={(e) =>
                            setDrawerIdea({
                              ...drawerIdea,
                              team: e.target.value,
                              idea: { ...(drawerIdea.idea || {}), team: e.target.value }
                            })
                          }
                          placeholder="e.g. Solo founder seeking CTO"
                        />
                      </div>

                      <div className="field">
                        <label className="label">Founder Commitment</label>
                        <select
                          value={drawerIdea.idea?.founderCommitment || drawerIdea.founderCommitment || 'Full-time founder'}
                          onChange={(e) =>
                            setDrawerIdea({
                              ...drawerIdea,
                              founderCommitment: e.target.value,
                              idea: { ...(drawerIdea.idea || {}), founderCommitment: e.target.value }
                            })
                          }
                        >
                          <option value="Full-time founder">Full-time founder</option>
                          <option value="Part-time (transitioning)">Part-time (transitioning)</option>
                          <option value="Nights &amp; Weekends">Nights &amp; Weekends</option>
                          <option value="Investor / Executive sponsor">Investor / Executive sponsor</option>
                        </select>
                      </div>
                    </div>

                    {/* 8. SUPPORT NEEDED */}
                    <div className="field">
                      <label className="label">Support Expected from Ideacubator</label>
                      <input
                        value={drawerIdea.idea?.supportNeeded || drawerIdea.supportNeeded || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            supportNeeded: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), supportNeeded: e.target.value }
                          })
                        }
                        placeholder="e.g. Full technical co-builder, AI agent architecture, customer intro &amp; seed capital"
                      />
                    </div>

                    {/* 9. DEMO / EXTERNAL LINK */}
                    <div className="field">
                      <label className="label">Demo / External Link (Figma, Loom, GitHub)</label>
                      <input
                        type="url"
                        value={drawerIdea.externalLink || drawerIdea.idea?.externalLink || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            externalLink: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), externalLink: e.target.value }
                          })
                        }
                        placeholder="https://..."
                      />
                    </div>

                    {/* 10. ADDITIONAL CONTEXT / THESIS NOTES */}
                    <div className="field">
                      <label className="label">Additional Notes &amp; Market Insights</label>
                      <textarea
                        value={drawerIdea.additionalContext || drawerIdea.idea?.additionalContext || ''}
                        onChange={(e) =>
                          setDrawerIdea({
                            ...drawerIdea,
                            additionalContext: e.target.value,
                            idea: { ...(drawerIdea.idea || {}), additionalContext: e.target.value }
                          })
                        }
                        style={{ minHeight: '65px' }}
                        placeholder="Any other data, competitor analysis, or context for the studio review team..."
                      />
                    </div>

                    {/* 11. Attached Documents Quick Summary in Details Tab */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--paper)', borderRadius: '10px', border: '1px solid var(--line)', marginTop: '4px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600 }}>Pitch Decks &amp; Attached Files</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                          {(drawerIdea.documents || []).filter((d: any) => !d.isDeleted).length} file(s) attached
                        </div>
                      </div>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setDrawerTab('meetings')}
                        style={{ fontSize: '11px', padding: '6px 12px' }}
                      >
                        Manage &amp; Attach Files →
                      </button>
                    </div>
                  </div>
                )}

                {drawerTab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '420px' }}>
                    <div className="chat-messages" style={{ flex: 1, padding: '10px 0' }}>
                      {messages.map((m) => {
                        const isMine = m.senderRole === 'founder';
                        return (
                          <div key={m.id} className={`chat-row ${isMine ? 'mine' : 'theirs'}`}>
                            <div className="chat-bubble">{m.content}</div>
                            <div className="chat-info">
                              <span>{isMine ? 'You' : m.senderName || 'Studio'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {messages.length === 0 && (
                        <p style={{ color: 'var(--ink-3)', fontSize: '13px', textAlign: 'center', margin: 'auto' }}>
                          No messages yet. Send a note below.
                        </p>
                      )}
                    </div>
                    <form onSubmit={handleSendMessage} className="chat-input-bar" style={{ padding: '10px 0 0' }}>
                      <input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type message..."
                      />
                      <button type="submit" className="primary" style={{ padding: '8px 14px' }}>
                        Send
                      </button>
                    </form>
                  </div>
                )}

                {/* ── TAB 3: MATERIALS & DOCUMENTS MANAGEMENT ── */}
                {drawerTab === 'meetings' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '15px' }}>Pitch Decks &amp; Supplementary Materials</h4>
                        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--ink-3)' }}>
                          Upload new pitch decks, financial models, or remove outdated documents.
                        </p>
                      </div>
                    </div>

                    {/* EXISTING DOCUMENTS LIST */}
                    {drawerIdea.documents && drawerIdea.documents.filter((d: any) => !d.isDeleted).length > 0 ? (
                      <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                        {drawerIdea.documents.map((doc: any, i: number) => {
                          if (doc.isDeleted) return null;
                          return (
                            <div
                              key={i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: 'var(--paper)',
                                borderRadius: '10px',
                                border: '1px solid var(--line)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                <span style={{ fontSize: '18px' }}>📄</span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {doc.name || 'Document'}
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'var(--ink-3)', display: 'flex', gap: '8px' }}>
                                    {doc.size ? <span>{formatFileSize(doc.size)}</span> : null}
                                    {doc.uploadedAt ? (
                                      <span>• {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                                {doc.downloadUrl && (
                                  <a
                                    href={doc.downloadUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="secondary"
                                    style={{ fontSize: '11px', padding: '5px 10px', textDecoration: 'none' }}
                                  >
                                    Download ↗
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDrawerDoc(i)}
                                  title="Remove document"
                                  style={{
                                    background: 'var(--red-soft)',
                                    color: 'var(--red)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '5px 9px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✕ Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--paper)', borderRadius: '10px', border: '1px dashed var(--line)', marginBottom: '16px' }}>
                        <p style={{ color: 'var(--ink-3)', fontSize: '13px', margin: 0 }}>No documents currently attached to this venture.</p>
                      </div>
                    )}

                    {/* ATTACH NEW DOCUMENT DROP/UPLOAD AREA */}
                    <div style={{ padding: '16px', border: '2px dashed var(--line)', borderRadius: '12px', textAlign: 'center', background: 'var(--paper)' }}>
                      <input
                        type="file"
                        id="drawerAttachFileInput"
                        accept=".pdf,.doc,.docx,.ppt,.pptx"
                        style={{ display: 'none' }}
                        onChange={handleAttachDrawerFile}
                        disabled={isUploadingDoc}
                      />
                      <label
                        htmlFor="drawerAttachFileInput"
                        style={{
                          cursor: isUploadingDoc ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 18px',
                          background: 'var(--ink)',
                          color: 'var(--paper)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}
                      >
                        {isUploadingDoc ? '⏳ Uploading Document...' : '📎 Attach New Pitch Deck / Document'}
                      </label>
                      <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--ink-3)' }}>
                        Supported formats: PDF, DOC, DOCX, PPT, PPTX (up to 15MB)
                      </p>
                      {docUploadError && (
                        <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--red)', fontWeight: 500 }}>
                          {docUploadError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* DRAWER FOOTER */}
              <div className="drawer-footer">
                <button type="button" className="secondary" onClick={() => setIsIdeaDrawerOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleSaveDrawerIdea}
                  disabled={savingIdea || isUploadingDoc}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  {savingIdea ? 'Saving All Venture Changes...' : 'Save All Venture Changes →'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SLIDE-OVER DRAWER 2: EDIT PROFILE
      ════════════════════════════════════════════════════════════════ */}
      <div className={`drawer-backdrop ${isProfileDrawerOpen ? 'open' : ''}`} onClick={() => setIsProfileDrawerOpen(false)}>
        <div className="slide-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Edit Founder Profile</h3>
              <span className="help">Updates apply across all studio applications</span>
            </div>
            <button
              type="button"
              onClick={() => setIsProfileDrawerOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--ink-3)' }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="drawer-body">
              <div style={{ display: 'grid', gap: '14px' }}>
                <div className="field">
                  <label className="label">Full Name</label>
                  <input
                    required
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label className="label">Phone / WhatsApp</label>
                  <input
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="field">
                  <label className="label">Location</label>
                  <input
                    value={profileForm.location}
                    onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                    placeholder="Bangalore, India"
                  />
                </div>

                <div className="field">
                  <label className="label">Professional Role / Title</label>
                  <input
                    value={profileForm.role}
                    onChange={(e) => setProfileForm({ ...profileForm, role: e.target.value })}
                    placeholder="e.g. Lead Engineer, Product VP, Doctor"
                  />
                </div>

                <div className="field">
                  <label className="label">Years of Experience</label>
                  <input
                    type="number"
                    value={profileForm.experienceYears}
                    onChange={(e) => setProfileForm({ ...profileForm, experienceYears: e.target.value })}
                  />
                </div>

                <div className="field">
                  <label className="label">LinkedIn Profile</label>
                  <input
                    type="url"
                    value={profileForm.linkedIn}
                    onChange={(e) => setProfileForm({ ...profileForm, linkedIn: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button type="button" className="secondary" onClick={() => setIsProfileDrawerOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={profileSaving}>
                {profileSaving ? 'Saving…' : 'Save Profile →'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          SLIDE-OVER DRAWER 3: SCHEDULE MEETING
      ════════════════════════════════════════════════════════════════ */}
      <div className={`drawer-backdrop ${isMeetingDrawerOpen ? 'open' : ''}`} onClick={() => setIsMeetingDrawerOpen(false)}>
        <div className="slide-drawer" onClick={(e) => e.stopPropagation()}>
          <div className="drawer-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Schedule Partner Strategy Session</h3>
              <span className="help">45-minute technical diligence session with Ideacubator</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMeetingDrawerOpen(false)}
              style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--ink-3)' }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleBookMeeting} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div className="drawer-body">
              <div style={{ display: 'grid', gap: '14px' }}>
                <div className="field">
                  <label className="label">Select Venture</label>
                  <select
                    value={meetingAppId}
                    onChange={(e) => setMeetingAppId(e.target.value)}
                  >
                    {applications.map((app) => (
                      <option key={app.id} value={app.id}>
                        {app.idea?.title || app.title || 'Untitled Venture'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Meeting Date</label>
                  <input
                    type="date"
                    required
                    value={meetingDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setMeetingDate(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="label">Time Slot (IST)</label>
                  <select value={meetingSlot} onChange={(e) => setMeetingSlot(e.target.value)}>
                    <option value="10:00 AM – 10:45 AM IST">10:00 AM – 10:45 AM IST</option>
                    <option value="11:00 AM – 11:45 AM IST">11:00 AM – 11:45 AM IST</option>
                    <option value="02:30 PM – 03:15 PM IST">02:30 PM – 03:15 PM IST</option>
                    <option value="04:00 PM – 04:45 PM IST">04:00 PM – 04:45 PM IST</option>
                    <option value="06:00 PM – 06:45 PM IST">06:00 PM – 06:45 PM IST</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label">Discussion Agenda / Specific Questions</label>
                  <textarea
                    value={meetingAgenda}
                    onChange={(e) => setMeetingAgenda(e.target.value)}
                    placeholder="e.g. Architecture review, customer wedge validation, or tech co-builder terms..."
                    style={{ minHeight: '100px' }}
                  />
                </div>

                <div className="note">
                  🔒 In-app session. Upon booking, a notification is immediately dispatched to the Ideacubator studio mailbox (team@ideacubator.in).
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button type="button" className="secondary" onClick={() => setIsMeetingDrawerOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary" disabled={meetingSubmitting}>
                {meetingSubmitting ? 'Scheduling…' : 'Confirm & Schedule Session →'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
