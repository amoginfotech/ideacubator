/**
 * Ideacubator Admin Operations Console (assets/js/admin.js)
 * Deal Flow Evaluation, Status Management, Internal Notes, and Founder Collaboration.
 */
(function () {
  'use strict';

  let currentAdminUser = null;
  let allApplications = [];
  let selectedApp = null;
  let unsubscribeApps = null;

  const STATUS_LABELS = {
    received: 'Received',
    under_review: 'Under Review',
    clarification_requested: 'Clarification Requested',
    meeting_requested: 'Meeting Requested',
    evaluation: 'Evaluation',
    next_step: 'Next Step',
    active: 'Active',
    paused: 'Paused',
    declined: 'Declined',
    archived: 'Archived'
  };

  function formatTimestamp(ts) {
    if (!ts) return '—';
    let date;
    if (ts.toDate) date = ts.toDate();
    else if (ts.seconds) date = new Date(ts.seconds * 1000);
    else date = new Date(ts);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Auth & Admin Claims Verification
  function initAdmin() {
    if (!window.IC_AUTH) {
      setTimeout(initAdmin, 200);
      return;
    }

    window.IC_AUTH.onAuthStateChanged(async (user) => {
      const loginSection = document.getElementById('adminLoginSection');
      const dashSection = document.getElementById('adminDashboardSection');
      const adminEmailEl = document.getElementById('currentAdminEmail');

      if (!user) {
        if (loginSection) loginSection.style.display = 'block';
        if (dashSection) dashSection.style.display = 'none';
        return;
      }

      const isAdmin = await window.IC_AUTH.checkAdminRole(user);

      if (isAdmin) {
        currentAdminUser = user;
        if (adminEmailEl) adminEmailEl.textContent = user.email || 'Admin';
        if (loginSection) loginSection.style.display = 'none';
        if (dashSection) dashSection.style.display = 'block';

        bindPipelineStream();
      } else {
        await window.IC_AUTH.signOut();
        const errEl = document.getElementById('adminLoginError');
        if (errEl) {
          errEl.textContent = 'Access restricted: You do not have verified administrator privileges.';
          errEl.style.display = 'block';
        }
        if (loginSection) loginSection.style.display = 'block';
        if (dashSection) dashSection.style.display = 'none';
      }
    });
  }

  // Admin Google Sign In
  window.adminGoogleSignIn = async function () {
    const errEl = document.getElementById('adminLoginError');
    if (errEl) errEl.style.display = 'none';

    try {
      await window.IC_AUTH.signInWithGoogle();
    } catch (err) {
      if (errEl) {
        errEl.textContent = 'Sign-in failed: ' + (err.message || err);
        errEl.style.display = 'block';
      }
    }
  };

  // Pipeline stream
  function bindPipelineStream() {
    const db = window.IC_FIREBASE?.db;
    if (!db) return;

    if (unsubscribeApps) unsubscribeApps();

    const loadingEl = document.getElementById('adminLoading');
    if (loadingEl) loadingEl.style.display = 'block';

    unsubscribeApps = db.collection('applications')
      .onSnapshot((snapshot) => {
        if (loadingEl) loadingEl.style.display = 'none';

        allApplications = [];
        snapshot.forEach(doc => allApplications.push({ id: doc.id, ...doc.data() }));

        // Sort descending by creation date
        allApplications.sort((a, b) => {
          const tA = a.metadata?.createdAt?.seconds || 0;
          const tB = b.metadata?.createdAt?.seconds || 0;
          return tB - tA;
        });

        renderKPIs();
        filterAndRenderTable();
      }, (err) => {
        console.error('Admin stream error:', err);
        if (loadingEl) loadingEl.style.display = 'none';
        window.portalToast('Could not load deal flow: ' + err.message, 'error');
      });
  }

  function renderKPIs() {
    const totalEl = document.getElementById('statTotal');
    const reviewEl = document.getElementById('statReview');
    const activeEl = document.getElementById('statActive');
    const declinedEl = document.getElementById('statDeclined');

    const total = allApplications.length;
    const review = allApplications.filter(a => a.metadata?.status === 'received' || a.metadata?.status === 'under_review').length;
    const active = allApplications.filter(a => a.metadata?.status === 'active' || a.metadata?.status === 'evaluation').length;
    const declined = allApplications.filter(a => a.metadata?.status === 'declined').length;

    if (totalEl) totalEl.textContent = total;
    if (reviewEl) reviewEl.textContent = review;
    if (activeEl) activeEl.textContent = active;
    if (declinedEl) declinedEl.textContent = declined;
  }

  window.filterAndRenderTable = function () {
    const searchVal = (document.getElementById('adminSearch')?.value || '').toLowerCase();
    const statusVal = document.getElementById('adminStatusFilter')?.value || 'all';
    const tableBody = document.getElementById('applicationsTableBody');
    if (!tableBody) return;

    const filtered = allApplications.filter(app => {
      const name = (app.profile?.fullName || '').toLowerCase();
      const email = (app.profile?.email || '').toLowerCase();
      const title = (app.idea?.title || '').toLowerCase();
      const status = app.metadata?.status || 'received';

      const matchesSearch = !searchVal || name.includes(searchVal) || email.includes(searchVal) || title.includes(searchVal);
      const matchesStatus = statusVal === 'all' || status === statusVal;

      return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:32px;color:var(--ink-3);">
            No matching applications found.
          </td>
        </tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map(app => {
      const status = app.metadata?.status || 'received';
      const statusLabel = STATUS_LABELS[status] || status;
      let badgeClass = 'badge';
      if (status === 'active') badgeClass += ' badge-success';
      else if (status === 'under_review' || status === 'clarification_requested') badgeClass += ' badge-warning';
      else if (status === 'declined') badgeClass += ' badge-danger';
      else badgeClass += ' badge-secondary';

      return `
        <tr style="border-bottom:1px solid var(--line);">
          <td style="padding:14px 16px;">
            <strong>${window.escapeHtml(app.profile?.fullName || '—')}</strong>
            <div style="font-size:11px;color:var(--ink-3);">${window.escapeHtml(app.profile?.email || '—')}</div>
          </td>
          <td style="padding:14px 16px;">
            <strong>${window.escapeHtml(app.idea?.title || 'Untitled')}</strong>
            <div style="font-size:11px;color:var(--ink-3);">${window.escapeHtml(app.idea?.currentStage || 'Stage not set')}</div>
          </td>
          <td style="padding:14px 16px;">
            <span style="font-size:12px;color:var(--ink-2);">${window.escapeHtml(app.profile?.userType || '—')}</span>
          </td>
          <td style="padding:14px 16px;">
            <span class="${badgeClass}">${statusLabel}</span>
          </td>
          <td style="padding:14px 16px;font-size:12px;color:var(--ink-3);">
            ${formatTimestamp(app.metadata?.createdAt)}
          </td>
          <td style="padding:14px 16px;text-align:right;">
            <button type="button" class="primary" style="padding:6px 14px;font-size:12px;" onclick="openApplicationModal('${app.id}')">
              Evaluate →
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // Open Application Detail Modal
  window.openApplicationModal = async function (appId) {
    selectedApp = allApplications.find(a => a.id === appId);
    if (!selectedApp) return;

    const modal = document.getElementById('appDetailModal');
    const content = document.getElementById('appDetailContent');
    if (!modal || !content) return;

    // Load private admin notes for this application
    let notes = [];
    try {
      const db = window.IC_FIREBASE.db;
      const notesSnap = await db.collection('admin_notes')
        .where('applicationId', '==', appId)
        .get();
      notesSnap.forEach(d => notes.push({ id: d.id, ...d.data() }));
      notes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (err) {
      console.warn('Could not load internal notes:', err);
    }

    const status = selectedApp.metadata?.status || 'received';

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:24px;border-bottom:1px solid var(--line);padding-bottom:18px;">
        <div>
          <div class="eyebrow">Application Details · ${selectedApp.id}</div>
          <h2 style="font-size:26px;margin:6px 0 4px;">${window.escapeHtml(selectedApp.idea?.title || 'Untitled')}</h2>
          <div style="font-size:13px;color:var(--ink-2);">
            Founder: <strong>${window.escapeHtml(selectedApp.profile?.fullName)}</strong> (${window.escapeHtml(selectedApp.profile?.email)}) · ${window.escapeHtml(selectedApp.profile?.location || 'Location not specified')}
          </div>
        </div>
        <div>
          <button type="button" class="secondary" onclick="closeDetailModal()">Close ✕</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1.2fr 0.8fr;gap:24px;">
        <!-- Left: Founder & Idea Details -->
        <div>
          <div class="card pad" style="margin-bottom:16px;">
            <h4 style="margin:0 0 12px;font-size:16px;">Founder Profile</h4>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div><strong>Role:</strong> ${window.escapeHtml(selectedApp.profile?.role || '—')}</div>
              <div><strong>Experience:</strong> ${selectedApp.profile?.experienceYears != null ? selectedApp.profile.experienceYears + ' yrs' : '—'}</div>
              <div><strong>Phone:</strong> ${window.escapeHtml(selectedApp.profile?.phone || '—')}</div>
              <div><strong>Type:</strong> ${window.escapeHtml(selectedApp.profile?.userType || '—')}</div>
              ${selectedApp.profile?.linkedIn ? `<div style="grid-column:1/-1;"><strong>Profile:</strong> <a href="${window.escapeHtml(selectedApp.profile.linkedIn)}" target="_blank" style="color:var(--brown);text-decoration:underline;">${window.escapeHtml(selectedApp.profile.linkedIn)}</a></div>` : ''}
            </div>
          </div>

          <div class="card pad" style="margin-bottom:16px;">
            <h4 style="margin:0 0 12px;font-size:16px;">Idea & Business Concept</h4>
            <div style="margin-bottom:12px;">
              <strong style="display:block;font-size:12px;color:var(--brown);text-transform:uppercase;">Description</strong>
              <p style="margin:4px 0;font-size:14px;color:var(--ink);">${window.escapeHtml(selectedApp.idea?.description || '—')}</p>
            </div>
            <div style="margin-bottom:12px;">
              <strong style="display:block;font-size:12px;color:var(--brown);text-transform:uppercase;">Problem Addressed</strong>
              <p style="margin:4px 0;font-size:14px;color:var(--ink-2);">${window.escapeHtml(selectedApp.idea?.problem || '—')}</p>
            </div>
            <div style="margin-bottom:12px;">
              <strong style="display:block;font-size:12px;color:var(--brown);text-transform:uppercase;">Target Customer</strong>
              <p style="margin:4px 0;font-size:14px;color:var(--ink-2);">${window.escapeHtml(selectedApp.idea?.customer || '—')}</p>
            </div>
            <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
              <div><strong>Stage:</strong> ${window.escapeHtml(selectedApp.idea?.currentStage || '—')}</div>
              <div><strong>Geography:</strong> ${window.escapeHtml(selectedApp.idea?.geography || '—')}</div>
              <div><strong>Traction:</strong> ${window.escapeHtml(selectedApp.idea?.traction || 'None reported')}</div>
              <div><strong>Monetization:</strong> ${window.escapeHtml(selectedApp.idea?.monetization || '—')}</div>
              <div style="grid-column:1/-1;"><strong>Support Needed:</strong> ${window.escapeHtml(selectedApp.idea?.supportNeeded || '—')}</div>
            </div>
          </div>

          <!-- Documents -->
          <div class="card pad" style="margin-bottom:16px;">
            <h4 style="margin:0 0 12px;font-size:16px;">Attached Documents (${(selectedApp.documents || []).length})</h4>
            ${(selectedApp.documents || []).length === 0 ? '<div style="color:var(--ink-3);font-size:13px;">No documents attached by founder.</div>' : `
              <div class="list">
                ${selectedApp.documents.map(d => `
                  <div class="row">
                    <div>
                      <div class="row-title">📄 ${window.escapeHtml(d.name)}</div>
                      <div class="row-meta">${window.formatFileSize(d.size)}</div>
                    </div>
                    ${d.downloadUrl ? `<a href="${window.escapeHtml(d.downloadUrl)}" target="_blank" class="secondary" style="padding:4px 10px;font-size:11px;">Download ↗</a>` : ''}
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Right: Actions, Status, Internal Notes -->
        <div>
          <!-- Update Status Card -->
          <div class="card pad" style="margin-bottom:16px;">
            <h4 style="margin:0 0 12px;font-size:16px;">Pipeline Status</h4>
            <form id="statusUpdateForm" style="display:grid;gap:10px;">
              <select id="modalStatusSelect" class="form-select">
                ${Object.entries(STATUS_LABELS).map(([k, label]) => `
                  <option value="${k}" ${k === status ? 'selected' : ''}>${label}</option>
                `).join('')}
              </select>
              <textarea id="modalStatusNote" placeholder="Status change reason or note to log in history..." style="min-height:60px;"></textarea>
              <button type="submit" class="primary" style="width:100%;">Update Status</button>
            </form>
          </div>

          <!-- Internal Notes (Restricted Team Only) -->
          <div class="card pad" style="margin-bottom:16px;background:var(--paper-2);border-color:var(--brown-soft);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
              <h4 style="margin:0;font-size:15px;color:var(--brown);">🔒 Internal Team Notes</h4>
              <span class="badge badge-warning" style="font-size:10px;">Confidential</span>
            </div>
            <p style="font-size:11px;color:var(--ink-3);margin:0 0 10px;">Strictly confidential. Never visible to founders or applicants.</p>

            <form id="addInternalNoteForm" style="display:grid;gap:8px;margin-bottom:14px;">
              <textarea id="internalNoteText" required placeholder="Add confidential review note, scorecard, or due diligence remark..." style="min-height:75px;background:#fff;"></textarea>
              <button type="submit" class="secondary" style="width:100%;">Add Internal Note</button>
            </form>

            <div id="internalNotesList" style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
              ${notes.length === 0 ? '<div style="font-size:12px;color:var(--ink-3);">No internal notes yet.</div>' : notes.map(n => `
                <div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:12px;">
                  <div style="font-size:10px;font-weight:700;color:var(--brown);margin-bottom:3px;">
                    ${window.escapeHtml(n.author || 'Admin')} · ${formatTimestamp(n.createdAt)}
                  </div>
                  <div>${window.escapeHtml(n.note)}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Quick Actions: Send Message, Assign Task, Schedule Meeting -->
          <div class="card pad">
            <h4 style="margin:0 0 12px;font-size:15px;">Founder Actions</h4>
            <div style="display:grid;gap:8px;">
              <button type="button" class="secondary" onclick="promptAdminMessage('${selectedApp.id}')">✉ Send Message to Founder</button>
              <button type="button" class="secondary" onclick="promptAdminTask('${selectedApp.id}', '${selectedApp.applicantUid}')">✓ Assign Milestone Task</button>
              <button type="button" class="secondary" onclick="promptAdminMeeting('${selectedApp.id}', '${selectedApp.applicantUid}')">◷ Schedule Interview Session</button>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.classList.add('open');

    // Status update handler
    document.getElementById('statusUpdateForm').onsubmit = async (e) => {
      e.preventDefault();
      const newStatus = document.getElementById('modalStatusSelect').value;
      const note = document.getElementById('modalStatusNote').value.trim();

      try {
        const db = window.IC_FIREBASE.db;
        const newHistoryItem = {
          status: newStatus,
          at: new Date().toISOString(),
          by: currentAdminUser.email || 'admin',
          note: note || `Status updated to ${STATUS_LABELS[newStatus] || newStatus}`
        };

        await db.collection('applications').doc(appId).update({
          'metadata.status': newStatus,
          'metadata.updatedAt': firebase.firestore.FieldValue.serverTimestamp(),
          statusHistory: firebase.firestore.FieldValue.arrayUnion(newHistoryItem)
        });

        window.portalToast(`Status updated to ${STATUS_LABELS[newStatus]}.`, 'success');
        closeDetailModal();
      } catch (err) {
        console.error('Failed to update status:', err);
        window.portalToast('Could not update status: ' + err.message, 'error');
      }
    };

    // Internal Note handler
    document.getElementById('addInternalNoteForm').onsubmit = async (e) => {
      e.preventDefault();
      const noteText = document.getElementById('internalNoteText').value.trim();
      if (!noteText) return;

      try {
        const db = window.IC_FIREBASE.db;
        await db.collection('admin_notes').add({
          applicationId: appId,
          author: currentAdminUser.email || 'admin',
          authorUid: currentAdminUser.uid,
          note: noteText,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        window.portalToast('Internal note saved.', 'success');
        openApplicationModal(appId); // refresh modal view
      } catch (err) {
        console.error('Failed to save internal note:', err);
        window.portalToast('Could not save note: ' + err.message, 'error');
      }
    };
  };

  window.closeDetailModal = function () {
    const modal = document.getElementById('appDetailModal');
    if (modal) modal.classList.remove('open');
    selectedApp = null;
  };

  // Quick action prompts
  window.promptAdminMessage = async function (appId) {
    const msg = prompt('Enter message to send to the founder:');
    if (!msg || !msg.trim()) return;

    try {
      const db = window.IC_FIREBASE.db;
      await db.collection('messages').add({
        applicationId: appId,
        senderUid: currentAdminUser.uid,
        senderRole: 'team',
        senderName: 'Ideacubator Team',
        body: msg.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false
      });
      window.portalToast('Message sent to founder workspace.', 'success');
    } catch (err) {
      alert('Error sending message: ' + err.message);
    }
  };

  window.promptAdminTask = async function (appId, applicantUid) {
    const title = prompt('Enter task title (e.g. "Submit revised financial model"):');
    if (!title || !title.trim()) return;

    const desc = prompt('Enter task description or required outcome:') || '';

    try {
      const db = window.IC_FIREBASE.db;
      await db.collection('tasks').add({
        applicationId: appId,
        applicantUid: applicantUid,
        title: title.trim(),
        description: desc.trim(),
        assignedTo: 'founder',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
      });
      window.portalToast('Task assigned to founder.', 'success');
    } catch (err) {
      alert('Error assigning task: ' + err.message);
    }
  };

  window.promptAdminMeeting = async function (appId, applicantUid) {
    const title = prompt('Meeting Title:', 'Ideacubator Partner Interview');
    if (!title) return;

    const dateStr = prompt('Date & Time (e.g. "Tomorrow 3:00 PM IST"):', 'Tomorrow 3:00 PM IST');
    if (!dateStr) return;

    const url = prompt('Video Call Link (Google Meet / Zoom):', 'https://meet.google.com/xyz-demo-ideacubator');

    try {
      const db = window.IC_FIREBASE.db;
      await db.collection('meetings').add({
        applicationId: appId,
        applicantUid: applicantUid,
        title: title.trim(),
        scheduledAt: dateStr.trim(),
        meetingUrl: url ? url.trim() : '',
        status: 'confirmed',
        createdBy: currentAdminUser.email || 'admin',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      window.portalToast('Meeting confirmed on founder workspace.', 'success');
    } catch (err) {
      alert('Error scheduling meeting: ' + err.message);
    }
  };

  // Sign out helper
  window.adminSignOut = async function () {
    if (window.IC_AUTH) {
      await window.IC_AUTH.signOut();
    }
    window.location.reload();
  };

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initAdmin();

    const searchInput = document.getElementById('adminSearch');
    const statusSelect = document.getElementById('adminStatusFilter');
    if (searchInput) searchInput.addEventListener('input', window.filterAndRenderTable);
    if (statusSelect) statusSelect.addEventListener('change', window.filterAndRenderTable);
  });
})();
