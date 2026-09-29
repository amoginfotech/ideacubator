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

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [adminMsg, setAdminMsg] = useState('');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    // 1500ms safety timeout so the page never hangs on verifying credentials
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

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'applications'), orderBy('metadata.createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const apps: any[] = [];
        snapshot.forEach((d) => apps.push({ id: d.id, ...d.data() }));
        setApplications(apps);
        if (apps.length > 0 && !selectedApp) {
          setSelectedApp(apps[0]);
        } else if (selectedApp) {
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

  const handleUpdateStage = async (newStage: number) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'applications', selectedApp.id), {
        stage: newStage,
        'metadata.updatedAt': serverTimestamp()
      });
      setSelectedApp({ ...selectedApp, stage: newStage });
    } catch (err: any) {
      alert('Failed to update stage: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedApp) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'applications', selectedApp.id), {
        status: newStatus,
        'metadata.status': newStatus,
        'metadata.updatedAt': serverTimestamp()
      });
      setSelectedApp({
        ...selectedApp,
        status: newStatus,
        metadata: { ...(selectedApp.metadata || {}), status: newStatus }
      });
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminMsg.trim() || !selectedApp || !user) return;

    try {
      await addDoc(collection(db, 'messages'), {
        applicationId: selectedApp.id,
        senderUid: user.uid,
        senderRole: 'team',
        senderName: 'Ideacubator Team',
        body: adminMsg.trim(),
        createdAt: serverTimestamp(),
        read: false
      });
      setAdminMsg('');
      alert('Message sent to founder workspace!');
    } catch (err: any) {
      alert('Error sending message: ' + err.message);
    }
  };

  if (loading) {
    return (
      <main className="page">
        <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span className="spinner"></span> Verifying credentials…
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="page">
        <div className="container" style={{ maxWidth: '440px', margin: '60px auto', textAlign: 'center' }}>
          <div className="card pad">
            <div style={{ fontSize: '32px', color: 'var(--brown)', marginBottom: '12px' }}>🔒</div>
            <span className="eyebrow">Restricted Access</span>
            <h2 style={{ fontSize: '24px', margin: '6px 0 10px' }}>Operations Console</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', marginBottom: '20px' }}>
              Deal flow evaluation, pipeline scoring, and due diligence are restricted to authorized review committee partners.
            </p>
            {!user ? (
              <button className="google" type="button" onClick={handleAdminSignIn} style={{ width: '100%' }}>
                Sign in with Partner Google Account
              </button>
            ) : (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--red)', marginBottom: '14px' }}>
                  Account <strong>{user.email}</strong> is not on the authorized studio admin list.
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

  return (
    <main className="page">
      <div className="container">
        <div className="page-head" style={{ alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <span className="eyebrow">Studio Partner Console</span>
            <h1 style={{ fontSize: '24px', margin: '4px 0 0' }}>Deal Flow &amp; Diligence Pipeline</h1>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--ink-2)' }}>{user.email}</span>
            <button className="secondary" type="button" onClick={() => signOut(auth)} style={{ padding: '6px 14px', fontSize: '12px' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* METRICS */}
        <div className="stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          <div className="stat">
            <strong>{applications.length}</strong>
            <span>Total Intake</span>
          </div>
          <div className="stat">
            <strong>{applications.filter((a) => a.stage === 1 || !a.stage).length}</strong>
            <span>Phase 01 Diligence</span>
          </div>
          <div className="stat">
            <strong>{applications.filter((a) => a.stage >= 2 && a.stage <= 4).length}</strong>
            <span>In Validation / Build</span>
          </div>
          <div className="stat">
            <strong>{applications.filter((a) => a.stage === 5).length}</strong>
            <span>Phase 05 Launch / GTM</span>
          </div>
        </div>

        {/* PIPELINE GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: '20px' }}>
          {/* APPS LIST */}
          <div className="card pad" style={{ padding: '16px' }}>
            <div className="eyebrow" style={{ marginBottom: '10px' }}>Submissions ({applications.length})</div>
            {applications.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--ink-3)', margin: '16px 0' }}>No submissions yet.</p>
            ) : (
              <div style={{ maxHeight: '720px', overflowY: 'auto', display: 'grid', gap: '8px' }}>
                {applications.map((app) => {
                  const isCurrent = selectedApp?.id === app.id;
                  const displayStatus = app.status || app.metadata?.status || 'received';
                  return (
                    <div
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: `1px solid ${isCurrent ? 'var(--brown)' : 'var(--line)'}`,
                        background: isCurrent ? 'var(--cream)' : 'var(--paper)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <strong style={{ fontSize: '13px', display: 'block', color: 'var(--ink)' }}>
                        {app.idea?.title || 'Untitled Concept'}
                      </strong>
                      <div style={{ fontSize: '11px', color: 'var(--ink-2)', marginTop: '2px' }}>
                        {app.founderName || app.founderEmail}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                        <span className="badge" style={{ fontSize: '9px' }}>Phase 0{app.stage || 1}</span>
                        <span style={{ fontSize: '10px', color: 'var(--brown)', textTransform: 'capitalize', fontWeight: 600 }}>
                          {displayStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DETAIL VIEW */}
          {selectedApp ? (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div className="card pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span className="eyebrow">{selectedApp.idea?.industry || selectedApp.founderType || 'Venture'}</span>
                    <h2 style={{ fontSize: '24px', margin: '4px 0' }}>{selectedApp.idea?.title || 'Untitled Concept'}</h2>
                    <div style={{ fontSize: '13px', color: 'var(--ink-2)' }}>
                      Founder: <strong>{selectedApp.founderName}</strong> ({selectedApp.founderEmail})
                      {selectedApp.founderPhone && <span> · Phone: {selectedApp.founderPhone}</span>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="badge" style={{ fontSize: '12px' }}>Phase 0{selectedApp.stage || 1}</span>
                    {selectedApp.founderPhone && (
                      <a
                        href={`https://wa.me/${selectedApp.founderPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="drawer-action-btn whatsapp-action"
                        style={{ fontSize: '11px', padding: '6px 12px' }}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </div>

                <div className="divider" style={{ margin: '16px 0' }}></div>

                {/* CORE DOSSIER */}
                <div style={{ display: 'grid', gap: '14px' }}>
                  {(selectedApp.idea?.description || selectedApp.idea?.oneLiner) && (
                    <div>
                      <strong>One-Line Description:</strong>
                      <p style={{ margin: '4px 0', fontSize: '13.5px', color: 'var(--ink)' }}>
                        {selectedApp.idea?.description || selectedApp.idea?.oneLiner}
                      </p>
                    </div>
                  )}

                  {selectedApp.idea?.problem && (
                    <div>
                      <strong>Problem Being Solved:</strong>
                      <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.55 }}>
                        {selectedApp.idea?.problem}
                      </p>
                    </div>
                  )}

                  {selectedApp.idea?.customer && (
                    <div>
                      <strong>Target Customer:</strong>
                      <p style={{ margin: '4px 0', fontSize: '13px', color: 'var(--ink-2)' }}>
                        {selectedApp.idea?.customer}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: 'var(--paper)', padding: '14px', borderRadius: '12px', border: '1px solid var(--line)' }}>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '9.5px' }}>Current Stage</span>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>{selectedApp.idea?.currentStage || 'Idea stage'}</div>
                    </div>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '9.5px' }}>Traction</span>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>{selectedApp.idea?.traction || 'Pre-traction'}</div>
                    </div>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '9.5px' }}>Monetization</span>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>{selectedApp.idea?.monetization || 'Exploring models'}</div>
                    </div>
                    <div>
                      <span className="eyebrow" style={{ fontSize: '9.5px' }}>Support Needed</span>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--ink)' }}>{selectedApp.idea?.supportNeeded || 'Technical co-building'}</div>
                    </div>
                  </div>

                  {/* SITUATION-SPECIFIC EXTRA FIELDS */}
                  {selectedApp.extra && Object.keys(selectedApp.extra).length > 0 && (
                    <div style={{ marginTop: '4px' }}>
                      <strong>Contextual Inputs:</strong>
                      <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
                        {Object.entries(selectedApp.extra).map(([k, v]) => (
                          <div key={k} style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                            <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}:</span> {String(v)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI REVIEW SCORECARD */}
                  {selectedApp.aiReview && (
                    <div style={{ background: 'var(--cream)', padding: '14px 16px', borderRadius: '12px', border: '1px solid var(--brown-soft)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="eyebrow" style={{ color: 'var(--brown)', margin: 0 }}>AI Review Summary</span>
                        <span className="badge" style={{ background: 'var(--brown)', color: '#fff' }}>
                          Score: {selectedApp.aiReview.clarityScore}/100
                        </span>
                      </div>
                      {selectedApp.aiReview.nextExperiment && (
                        <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: 'var(--ink)', lineHeight: 1.5 }}>
                          <strong>Recommended Next Experiment:</strong> {selectedApp.aiReview.nextExperiment}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ATTACHED DOCUMENTS */}
                <div style={{ marginTop: '18px' }}>
                  <strong>Attached Documents &amp; Materials:</strong>
                  {(!selectedApp.documents || selectedApp.documents.length === 0) && !selectedApp.externalLink ? (
                    <p style={{ fontSize: '12px', color: 'var(--ink-3)', marginTop: '4px' }}>No files uploaded.</p>
                  ) : (
                    <div style={{ display: 'grid', gap: '8px', marginTop: '8px' }}>
                      {selectedApp.documents?.map((d: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--paper)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                          <span style={{ fontSize: '12px' }}>📄 {d.name}</span>
                          {d.downloadUrl && (
                            <a href={d.downloadUrl} target="_blank" rel="noopener noreferrer" className="primary" style={{ fontSize: '11px', padding: '4px 10px' }}>
                              Download ↗
                            </a>
                          )}
                        </div>
                      ))}
                      {selectedApp.externalLink && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--paper)', borderRadius: '8px', border: '1px solid var(--line)' }}>
                          <span style={{ fontSize: '12px' }}>🔗 External Deck / Link: {selectedApp.externalLink}</span>
                          <a href={selectedApp.externalLink} target="_blank" rel="noopener noreferrer" className="secondary" style={{ fontSize: '11px', padding: '4px 10px' }}>
                            Open Link ↗
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="divider" style={{ margin: '20px 0' }}></div>

                {/* STAGE & STATUS CONTROLS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <span className="eyebrow">Advance Stage</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={updating}
                          className={(selectedApp.stage || 1) === s ? 'primary' : 'secondary'}
                          onClick={() => handleUpdateStage(s)}
                          style={{ fontSize: '11px', padding: '6px 12px' }}
                        >
                          Phase 0{s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="eyebrow">Update Diligence Status</span>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                      {['received', 'under_review', 'diligence', 'approved', 'declined'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={updating}
                          className={(selectedApp.status || selectedApp.metadata?.status || 'received') === st ? 'primary' : 'secondary'}
                          onClick={() => handleUpdateStatus(st)}
                          style={{ fontSize: '10.5px', padding: '6px 10px', textTransform: 'capitalize' }}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* MESSAGE FOUNDER FORM */}
              <div className="card pad">
                <span className="eyebrow">Direct Founder Messaging</span>
                <h3 style={{ fontSize: '16px', margin: '4px 0 12px' }}>Send Note to Founder Workspace</h3>
                <form onSubmit={handleSendAdminMessage} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    required
                    value={adminMsg}
                    onChange={(e) => setAdminMsg(e.target.value)}
                    placeholder="Enter message for founder's dashboard..."
                    style={{ flex: 1 }}
                  />
                  <button className="primary" type="submit" style={{ padding: '10px 18px' }}>
                    Send Message →
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="card pad" style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: 'var(--ink-3)', margin: 0 }}>Select an application from the intake list to inspect.</p>
            </div>
          )}
        </div>

        {/* SCHEDULED SESSIONS & INQUIRIES */}
        <div className="card pad" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow">Studio Calendar &amp; Mailbox</span>
              <h3 style={{ fontSize: '18px', margin: '4px 0 0' }}>Scheduled Strategy Reviews ({meetings.length})</h3>
            </div>
            <span className="help">All bookings automatically dispatched to team@ideacubator.in</span>
          </div>

          {meetings.length > 0 ? (
            <div style={{ display: 'grid', gap: '10px' }}>
              {meetings.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--line)',
                    background: 'var(--paper)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span className="badge" style={{ background: 'var(--green)', color: '#fff' }}>{m.status || 'Confirmed'}</span>
                      <strong style={{ fontSize: '14px' }}>{m.title || 'Strategy Review'}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ink-2)' }}>
                      Founder: <strong>{m.founderName}</strong> ({m.founderEmail}) · Phone: {m.founderPhone || '—'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--brown)', marginTop: '2px', fontWeight: 600 }}>
                      📅 {m.date} at {m.time}
                    </div>
                    {m.description && (
                      <div style={{ fontSize: '11px', color: 'var(--ink-3)', marginTop: '4px' }}>
                        Agenda: {m.description}
                      </div>
                    )}
                  </div>

                  <a
                    href={`https://wa.me/${m.founderPhone ? m.founderPhone.replace(/[^0-9]/g, '') : '917676333817'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="drawer-action-btn whatsapp-action"
                    style={{ fontSize: '11px', padding: '6px 12px' }}
                  >
                    WhatsApp Founder
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--ink-3)', fontSize: '13px', margin: 0 }}>No strategy sessions currently booked.</p>
          )}
        </div>
      </div>
    </main>
  );
}
