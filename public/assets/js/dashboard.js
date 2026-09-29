/**
 * Ideacubator Founder Workspace Engine (assets/js/dashboard.js)
 * Realtime Firestore listeners for Applications, Messages, Meetings, Tasks, and Documents.
 * Supports multi-idea portfolio table, idea edit drawer, tabbed panel switching, and profile management.
 */
(function () {
  'use strict';

  let currentUser = null;
  let currentApp = null;
  let userApplications = [];
  let userProfileData = null;
  let currentMeetings = [];

  let unsubscribeApp = null;
  let unsubscribeMessages = null;
  let unsubscribeMeetings = null;
  let unsubscribeTasks = null;
  let unsubscribeUserProfile = null;

  // Canonical status badges & labels
  const STATUS_MAP = {
    received: { label: 'Application Received', badge: 'badge-secondary' },
    submitted: { label: 'Submitted', badge: 'badge-secondary' },
    under_review: { label: 'Under Review', badge: 'badge-warning' },
    clarification_requested: { label: 'Clarification Requested', badge: 'badge-warning' },
    meeting_requested: { label: 'Meeting Requested', badge: 'badge' },
    evaluation: { label: 'Evaluation in Progress', badge: 'badge' },
    next_step: { label: 'Next Step', badge: 'badge-success' },
    active: { label: 'Active Venture', badge: 'badge-success' },
    in_build: { label: 'In Build Sprint', badge: 'badge-success' },
    launched: { label: 'Launched to Market', badge: 'badge-success' },
    paused: { label: 'Paused', badge: 'badge-secondary' },
    declined: { label: 'Not Moving Forward', badge: 'badge-danger' },
    archived: { label: 'Archived', badge: 'badge-secondary' }
  };

  const USER_TYPE_LABELS = {
    'student': 'Student / First-Time Builder',
    'domain-expert': 'Domain Specialist / Corporate Executive',
    'capital-ready': 'Capital-Ready Founder (Seed / Pre-Series A)',
    'scaling': 'Scaleup Operator (Post-Product / Scaling)',
    'validation-sprint': 'Rapid Prototyping / Sprint Builder',
    'm-and-a': 'Exit-Oriented Founder (M&A Pipeline)',
    'ipo-readiness': 'Institutional Scale / IPO Pipeline',
    'valuation': 'Valuation Optimization & Equity Restructuring',
    'india-to-global': 'Cross-Border Founder (India to US / Global)',
    'global-to-india': 'Inbound Operator (Global Venture to India)',
    'professional': 'Professional / Domain Expert'
  };

  // Helper date formatter
  function formatTimestamp(ts) {
    if (!ts) return '—';
    let date;
    if (ts.toDate) {
      date = ts.toDate();
    } else if (typeof ts === 'string' || typeof ts === 'number') {
      date = new Date(ts);
    } else if (ts.seconds) {
      date = new Date(ts.seconds * 1000);
    } else {
      return '—';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatTime(ts) {
    if (!ts) return '';
    let date;
    if (ts.toDate) date = ts.toDate();
    else date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  // ── TAB SWITCHING ENGINE ──
  window.switchDashboardTab = function (tabId, event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Update active state in sidebar links
    const sideLinks = document.querySelectorAll('.sidebar .side-link');
    sideLinks.forEach(link => {
      if (link.getAttribute('data-tab') === tabId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Hide all tab panels
    const panels = document.querySelectorAll('.tab-panel');
    panels.forEach(panel => {
      panel.style.display = 'none';
    });

    // Show target panel
    const targetPanel = document.getElementById(`panel-${tabId}`);
    if (targetPanel) {
      targetPanel.style.display = 'block';
    }

    // Scroll to top of panel smoothly if needed, but no page jumping
    const shell = document.querySelector('.shell');
    if (shell && window.innerWidth < 900) {
      targetPanel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ── AUTH GUARD & INIT ──
  function initDashboard() {
    if (!window.IC_AUTH) {
      setTimeout(initDashboard, 200);
      return;
    }

    window.IC_AUTH.onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = (window.IC_CONFIG && window.IC_CONFIG.routes && window.IC_CONFIG.routes.home) || '../index.html';
        return;
      }

      currentUser = user;
      renderBaseUserProfile(user);
      bindUserProfileStream(user.uid);
      bindApplicationsStream(user.uid);
    });
  }

  function renderBaseUserProfile(user) {
    const nameEl = document.getElementById('name');
    const emailEl = document.getElementById('email');
    const avatarEl = document.getElementById('avatar');
    const pNameEl = document.getElementById('pname');
    const pEmailEl = document.getElementById('pemail');

    const displayName = user.displayName || 'Founder';
    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email || '—';
    if (avatarEl) avatarEl.textContent = window.getInitials(displayName);
    if (pNameEl) pNameEl.textContent = displayName;
    if (pEmailEl) pEmailEl.textContent = user.email || '—';
  }

  // ── PROFILE STREAM & MODAL ──
  function bindUserProfileStream(uid) {
    const db = window.IC_FIREBASE?.db;
    if (!db) return;

    if (unsubscribeUserProfile) unsubscribeUserProfile();

    unsubscribeUserProfile = db.collection('users').doc(uid).onSnapshot((doc) => {
      if (doc.exists) {
        userProfileData = doc.data();
        applyProfileToDom(userProfileData);
      }
    }, (err) => {
      console.warn('User profile sync notice:', err);
    });
  }

  function applyProfileToDom(profile) {
    if (!profile) return;
    const pNameEl = document.getElementById('pname');
    const pEmailEl = document.getElementById('pemail');
    const pPhoneEl = document.getElementById('pphone');
    const pLocEl = document.getElementById('plocation');
    const pRoleEl = document.getElementById('prole');
    const pExpEl = document.getElementById('pexperience');
    const pTypeEl = document.getElementById('ptype');
    const pLinkEl = document.getElementById('plinkedin');

    const nameEl = document.getElementById('name');
    const avatarEl = document.getElementById('avatar');

    if (profile.fullName) {
      if (pNameEl) pNameEl.textContent = profile.fullName;
      if (nameEl) nameEl.textContent = profile.fullName;
      if (avatarEl) avatarEl.textContent = window.getInitials(profile.fullName);
    }
    if (profile.email && pEmailEl) pEmailEl.textContent = profile.email;
    if (pPhoneEl) pPhoneEl.textContent = profile.phone || '—';
    if (pLocEl) pLocEl.textContent = profile.location || '—';
    if (pRoleEl) pRoleEl.textContent = profile.role || '—';
    if (pExpEl) pExpEl.textContent = profile.experienceYears ? `${profile.experienceYears} Years` : '—';
    if (pTypeEl) pTypeEl.textContent = USER_TYPE_LABELS[profile.userType] || profile.userType || 'Domain Expert';
    if (pLinkEl) {
      if (profile.linkedIn) {
        pLinkEl.innerHTML = `<a href="${window.escapeHtml(profile.linkedIn)}" target="_blank" style="color:var(--brown);font-weight:600;text-decoration:underline;">${window.escapeHtml(profile.linkedIn)} ↗</a>`;
      } else {
        pLinkEl.textContent = '—';
      }
    }
  }

  window.openProfileEditModal = function () {
    const modal = document.getElementById('profileEditModal');
    if (!modal) return;

    const source = userProfileData || (currentApp && currentApp.profile) || {};
    document.getElementById('editFullName').value = source.fullName || currentUser?.displayName || '';
    document.getElementById('editPhone').value = source.phone || '';
    document.getElementById('editLocation').value = source.location || '';
    document.getElementById('editRole').value = source.role || '';
    document.getElementById('editExperience').value = source.experienceYears || '';
    document.getElementById('editUserType').value = source.userType || 'domain-expert';
    document.getElementById('editLinkedIn').value = source.linkedIn || '';

    modal.style.display = 'grid';
  };

  window.closeProfileEditModal = function () {
    const modal = document.getElementById('profileEditModal');
    if (modal) modal.style.display = 'none';
  };

  window.saveProfileEdits = async function (e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProfile');
    if (btn) btn.disabled = true;

    try {
      const db = window.IC_FIREBASE?.db;
      if (!db || !currentUser) throw new Error('Database service unavailable.');

      const updated = {
        fullName: document.getElementById('editFullName').value.trim(),
        phone: document.getElementById('editPhone').value.trim(),
        location: document.getElementById('editLocation').value.trim(),
        role: document.getElementById('editRole').value.trim(),
        experienceYears: Number(document.getElementById('editExperience').value) || 0,
        userType: document.getElementById('editUserType').value,
        linkedIn: document.getElementById('editLinkedIn').value.trim(),
        email: currentUser.email,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      // 1. Update user record
      await db.collection('users').doc(currentUser.uid).set(updated, { merge: true });

      // 2. If active application exists, update application profile metadata
      if (currentApp?.id) {
        await db.collection('applications').doc(currentApp.id).update({
          profile: updated,
          'metadata.updatedAt': firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      userProfileData = updated;
      applyProfileToDom(updated);
      closeProfileEditModal();
      window.portalToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error('Save profile error:', err);
      window.portalToast('Failed to save profile: ' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // ── MULTI-APPLICATION STREAM & KPI AGGREGATION ──
  function bindApplicationsStream(uid) {
    const db = window.IC_FIREBASE?.db;
    if (!db) return;

    if (unsubscribeApp) unsubscribeApp();

    unsubscribeApp = db.collection('applications')
      .where('applicantUid', '==', uid)
      .onSnapshot((snapshot) => {
        userApplications = [];
        snapshot.forEach(doc => {
          userApplications.push({ id: doc.id, ...doc.data() });
        });

        // Sort descending by creation date
        userApplications.sort((a, b) => {
          const timeA = a.metadata?.createdAt?.toMillis ? a.metadata.createdAt.toMillis() : new Date(a.metadata?.createdAt || 0).getTime();
          const timeB = b.metadata?.createdAt?.toMillis ? b.metadata.createdAt.toMillis() : new Date(b.metadata?.createdAt || 0).getTime();
          return timeB - timeA;
        });

        // 1. Compute & Update KPI Cards
        updateOverviewKPIs(userApplications);

        if (userApplications.length === 0) {
          renderNoApplicationState();
          renderEmptyIdeasTable();
          return;
        }

        // Primary application is the most recent
        currentApp = userApplications[0];
        renderApplicationWorkspace(currentApp);
        renderIdeasTable(userApplications);

        // Fallback user profile fields if not set in users doc
        if (!userProfileData && currentApp.profile) {
          applyProfileToDom(currentApp.profile);
        }

        // Bind child streams to primary active application
        bindMessagesStream(currentApp.id);
        bindMeetingsStream(currentApp.id);
        bindTasksStream(currentApp.id);
      }, (err) => {
        console.error('Applications snapshot error:', err);
        window.portalToast('Failed to load application data: ' + err.message, 'error');
      });
  }

  function updateOverviewKPIs(apps) {
    const totalIdeasEl = document.getElementById('statTotalIdeas');
    const underReviewEl = document.getElementById('statUnderReview');
    const inBuildEl = document.getElementById('statInBuild');
    const launchedEl = document.getElementById('statLaunched');

    let total = apps.length;
    let reviewCount = 0;
    let buildCount = 0;
    let launchedCount = 0;

    apps.forEach(app => {
      const status = app.metadata?.status || 'received';
      if (['received', 'submitted', 'under_review', 'clarification_requested', 'meeting_requested', 'evaluation'].includes(status)) {
        reviewCount++;
      } else if (['next_step', 'active', 'in_build', 'prototype', 'mvp'].includes(status)) {
        buildCount++;
      } else if (['launched', 'scaling', 'market'].includes(status)) {
        launchedCount++;
      }
    });

    if (totalIdeasEl) totalIdeasEl.textContent = total;
    if (underReviewEl) underReviewEl.textContent = reviewCount;
    if (inBuildEl) inBuildEl.textContent = buildCount;
    if (launchedEl) launchedEl.textContent = launchedCount;
  }

  function renderNoApplicationState() {
    const appTitle = document.getElementById('appTitle');
    const statusBadge = document.getElementById('status');
    const statusStat = document.getElementById('statusStat');

    if (appTitle) appTitle.textContent = 'Welcome to Ideacubator';
    if (statusBadge) {
      statusBadge.textContent = 'No submission';
      statusBadge.className = 'badge badge-secondary';
    }
    if (statusStat) statusStat.textContent = 'None';
  }

  function renderApplicationWorkspace(app) {
    const appTitle = document.getElementById('appTitle');
    const statusBadge = document.getElementById('status');
    const statusStat = document.getElementById('statusStat');

    const statusKey = app.metadata?.status || 'received';
    const statusConfig = STATUS_MAP[statusKey] || { label: statusKey, badge: 'badge' };

    if (appTitle) appTitle.textContent = app.idea?.title || 'Application Workspace';
    if (statusBadge) {
      statusBadge.textContent = statusConfig.label;
      statusBadge.className = `badge ${statusConfig.badge}`;
    }
    if (statusStat) statusStat.textContent = statusConfig.label;

    // Render documents list
    renderDocumentsList(app.documents || []);
  }

  // ── IDEAS TABLE VIEW ──
  function renderEmptyIdeasTable() {
    const container = document.getElementById('ideasTableContainer');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 48px 20px; background: var(--paper); border-radius: 14px; border: 1px dashed var(--line);">
        <div style="font-size: 32px; margin-bottom: 12px;">✦</div>
        <h4 style="font-size: 18px; margin: 0 0 8px;">No ideas submitted yet</h4>
        <p style="color: var(--ink-2); font-size: 13px; max-width: 440px; margin: 0 auto 20px;">
          Have a venture concept, enterprise workflow solution, or AI application? Submit your concept to begin validation with Ideacubator.
        </p>
        <a class="primary" href="submit-idea.html">+ Submit Your First Idea</a>
      </div>
    `;
  }

  function renderIdeasTable(apps) {
    const container = document.getElementById('ideasTableContainer');
    if (!container) return;

    if (!apps || apps.length === 0) {
      renderEmptyIdeasTable();
      return;
    }

    container.innerHTML = `
      <table class="ideas-table">
        <thead>
          <tr>
            <th style="min-width: 240px;">Idea Summary</th>
            <th style="min-width: 140px;">Current Stage</th>
            <th style="min-width: 130px;">Submitted</th>
            <th style="min-width: 150px;">Status</th>
            <th style="min-width: 220px; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apps.map(app => {
            const statusKey = app.metadata?.status || 'received';
            const statusCfg = STATUS_MAP[statusKey] || { label: statusKey, badge: 'badge' };
            const isEditable = ['received', 'submitted'].includes(statusKey);
            const dateStr = formatTimestamp(app.metadata?.createdAt);

            return `
              <tr>
                <td>
                  <strong style="display: block; font-size: 14px; color: var(--ink); margin-bottom: 3px;">
                    ${window.escapeHtml(app.idea?.title || 'Untitled Venture')}
                  </strong>
                  <div style="font-size: 12px; color: var(--ink-2); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${window.escapeHtml(app.idea?.problem || app.idea?.description || 'No description provided')}
                  </div>
                </td>
                <td>
                  <span style="font-size: 12px; font-weight: 600; color: var(--ink-2); background: var(--paper-2); padding: 4px 8px; border-radius: 6px;">
                    ${window.escapeHtml(app.idea?.currentStage || 'Concept')}
                  </span>
                </td>
                <td style="font-size: 12px; color: var(--ink-3); white-space: nowrap;">
                  ${dateStr}
                </td>
                <td>
                  <span class="badge ${statusCfg.badge}" style="white-space: nowrap;">
                    ${statusCfg.label}
                  </span>
                </td>
                <td style="text-align: right; white-space: nowrap;">
                  <button type="button" class="table-action-btn primary-btn" onclick="openIdeaDrawer('${app.id}')" title="${isEditable ? 'Edit your idea' : 'View details'}">
                    ${isEditable ? '✎ View & Edit' : '👁 View Details'}
                  </button>
                  <button type="button" class="table-action-btn" onclick="openMeetingRequestModal('${app.id}')" title="Request strategy meeting">
                    ◷ Meeting
                  </button>
                  <button type="button" class="table-action-btn" onclick="openIdeaChat('${app.id}')" title="Chat with venture team">
                    ✉ Chat
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // ── SLIDE-OUT DRAWER FOR IDEA VIEW & EDIT ──
  window.openIdeaDrawer = function (appId) {
    const app = userApplications.find(a => a.id === appId) || currentApp;
    if (!app) return;

    const drawerBackdrop = document.getElementById('ideaDrawerBackdrop');
    if (!drawerBackdrop) return;

    const statusKey = app.metadata?.status || 'received';
    const statusCfg = STATUS_MAP[statusKey] || { label: statusKey };
    const isEditable = ['received', 'submitted'].includes(statusKey);

    document.getElementById('drawerAppId').value = app.id;
    document.getElementById('drawerIdeaTitle').value = app.idea?.title || '';
    document.getElementById('drawerIdeaStage').value = app.idea?.currentStage || 'Idea only';
    document.getElementById('drawerIdeaProblem').value = app.idea?.problem || '';
    document.getElementById('drawerIdeaDesc').value = app.idea?.description || '';
    document.getElementById('drawerIdeaCustomer').value = app.idea?.customer || '';
    document.getElementById('drawerSubmittedDate').value = formatTimestamp(app.metadata?.createdAt);
    document.getElementById('drawerStatusText').value = statusCfg.label;

    const editableNotice = document.getElementById('drawerEditableNotice');
    const lockedNotice = document.getElementById('drawerLockedNotice');
    const saveBtn = document.getElementById('btnSaveDrawerIdea');

    // Toggle editable vs locked state
    const inputs = [
      document.getElementById('drawerIdeaTitle'),
      document.getElementById('drawerIdeaStage'),
      document.getElementById('drawerIdeaProblem'),
      document.getElementById('drawerIdeaDesc'),
      document.getElementById('drawerIdeaCustomer')
    ];

    inputs.forEach(input => {
      if (input) input.disabled = !isEditable;
    });

    if (isEditable) {
      if (editableNotice) editableNotice.style.display = 'block';
      if (lockedNotice) lockedNotice.style.display = 'none';
      if (saveBtn) saveBtn.style.display = 'inline-flex';
    } else {
      if (editableNotice) editableNotice.style.display = 'none';
      if (lockedNotice) lockedNotice.style.display = 'block';
      if (saveBtn) saveBtn.style.display = 'none';
    }

    drawerBackdrop.classList.add('open');
  };

  window.closeIdeaDrawer = function () {
    const drawerBackdrop = document.getElementById('ideaDrawerBackdrop');
    if (drawerBackdrop) drawerBackdrop.classList.remove('open');
  };

  window.saveDrawerIdea = async function () {
    const appId = document.getElementById('drawerAppId').value;
    if (!appId) return;

    const btn = document.getElementById('btnSaveDrawerIdea');
    if (btn) btn.disabled = true;

    try {
      const db = window.IC_FIREBASE?.db;
      if (!db) throw new Error('Database service unavailable.');

      const updatedTitle = document.getElementById('drawerIdeaTitle').value.trim();
      const updatedStage = document.getElementById('drawerIdeaStage').value;
      const updatedProblem = document.getElementById('drawerIdeaProblem').value.trim();
      const updatedDesc = document.getElementById('drawerIdeaDesc').value.trim();
      const updatedCustomer = document.getElementById('drawerIdeaCustomer').value.trim();

      if (!updatedTitle) {
        window.portalToast('Please provide a venture title.', 'error');
        return;
      }

      await db.collection('applications').doc(appId).update({
        'idea.title': updatedTitle,
        'idea.currentStage': updatedStage,
        'idea.problem': updatedProblem,
        'idea.description': updatedDesc,
        'idea.customer': updatedCustomer,
        'metadata.updatedAt': firebase.firestore.FieldValue.serverTimestamp()
      });

      window.portalToast('Idea updated successfully!', 'success');
      closeIdeaDrawer();
    } catch (err) {
      console.error('Failed to update idea:', err);
      window.portalToast('Error saving changes: ' + err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  window.openIdeaChat = function (appId) {
    // Switch to messages tab and focus input
    window.switchDashboardTab('messages');
    setTimeout(() => {
      const input = document.getElementById('messageInput');
      if (input) input.focus();
    }, 250);
  };

  // ── MESSAGING STREAM ──
  function bindMessagesStream(appId) {
    const db = window.IC_FIREBASE?.db;
    if (!db) return;

    if (unsubscribeMessages) unsubscribeMessages();

    const messagesCard = document.getElementById('messages');
    if (!messagesCard) return;

    unsubscribeMessages = db.collection('messages')
      .where('applicationId', '==', appId)
      .onSnapshot((snapshot) => {
        const msgs = [];
        let unreadCount = 0;

        snapshot.forEach(doc => {
          const data = doc.data();
          msgs.push({ id: doc.id, ...data });
          if (data.senderRole === 'team' && !data.read) {
            unreadCount++;
          }
        });

        // Sort ascending by creation time
        msgs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime();
          return timeA - timeB;
        });

        const unreadEl = document.getElementById('unread');
        if (unreadEl) unreadEl.textContent = unreadCount;

        renderMessagesThread(messagesCard, msgs, appId);
      }, (err) => {
        console.error('Messages snapshot error:', err);
      });
  }

  function renderMessagesThread(container, msgs, appId) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:16px;">
        <div>
          <div class="eyebrow">Communication</div>
          <h3 style="font-size:22px;margin:4px 0 0;">Messages & Team Conversation</h3>
        </div>
        <span class="badge">${msgs.length} messages</span>
      </div>

      <div id="messagesFeed" style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding-right:6px;margin-bottom:18px;">
        ${msgs.length === 0 ? `
          <div class="empty" style="padding:28px;text-align:center;color:var(--ink-3);background:var(--paper);border-radius:12px;">
            No messages yet. Send a note to the Ideacubator team below.
          </div>
        ` : msgs.map(m => {
          const isFounder = m.senderRole === 'founder';
          return `
            <div style="display:flex;flex-direction:column;align-items:${isFounder ? 'flex-end' : 'flex-start'};">
              <div style="max-width:85%;padding:12px 16px;border-radius:14px;background:${isFounder ? 'var(--brown)' : 'var(--paper)'};color:${isFounder ? '#fff' : 'var(--ink)'};border:1px solid ${isFounder ? 'var(--brown)' : 'var(--line)'};font-size:13px;line-height:1.5;">
                <div style="font-size:10px;font-weight:700;opacity:0.8;margin-bottom:4px;">
                  ${window.escapeHtml(m.senderName || (isFounder ? 'You' : 'Ideacubator Team'))} · ${formatTime(m.createdAt)}
                </div>
                <div>${window.escapeHtml(m.body)}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <form id="messageForm" style="display:flex;gap:10px;align-items:center;">
        <input type="text" id="messageInput" required placeholder="Type a message or response..." style="flex:1;">
        <button type="submit" class="primary" style="padding:12px 20px;">Send</button>
      </form>
    `;

    // Auto-scroll feed to bottom
    const feed = document.getElementById('messagesFeed');
    if (feed) feed.scrollTop = feed.scrollHeight;

    // Send handler
    const form = document.getElementById('messageForm');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('messageInput');
        const text = input.value.trim();
        if (!text) return;

        input.disabled = true;
        try {
          const db = window.IC_FIREBASE.db;
          await db.collection('messages').add({
            applicationId: appId,
            senderUid: currentUser.uid,
            senderRole: 'founder',
            senderName: currentUser.displayName || 'Founder',
            body: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            read: false
          });
          input.value = '';
        } catch (err) {
          console.error('Failed to send message:', err);
          window.portalToast('Could not send message: ' + err.message, 'error');
        } finally {
          input.disabled = false;
          input.focus();
        }
      };
    }
  }

  // ── MEETINGS / CALENDAR STREAM ──
  function bindMeetingsStream(appId) {
    const db = window.IC_FIREBASE?.db;
    if (!db) return;

    if (unsubscribeMeetings) unsubscribeMeetings();

    const meetingsCard = document.getElementById('meetings');
    if (!meetingsCard) return;

    unsubscribeMeetings = db.collection('meetings')
      .where('applicationId', '==', appId)
      .onSnapshot((snapshot) => {
        const meetings = [];
        snapshot.forEach(doc => meetings.push({ id: doc.id, ...doc.data() }));
        currentMeetings = meetings;

        const upcomingCount = meetings.filter(m => m.status === 'confirmed').length;
        const upcomingEl = document.getElementById('upcoming');
        if (upcomingEl) upcomingEl.textContent = upcomingCount;

        renderMeetingsCard(meetingsCard, meetings, appId);
      }, (err) => {
        console.error('Meetings error:', err);
      });
  }

  function renderMeetingsCard(container, meetings, appId) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:16px;">
        <div>
          <div class="eyebrow">Calendar & Interviews</div>
          <h3 style="font-size:22px;margin:4px 0 0;">Meetings</h3>
        </div>
        <button class="primary" type="button" onclick="openMeetingRequestModal('${appId}')">Request Meeting</button>
      </div>

      ${meetings.length === 0 ? `
        <div class="empty" style="padding:28px;text-align:center;color:var(--ink-3);background:var(--paper);border-radius:12px;">
          No meetings scheduled yet. As your idea progresses through review, interview slots and video links will appear here.
        </div>
      ` : `
        <div class="list">
          ${meetings.map(m => {
            const hasVideo = !!m.meetingUrl;
            const isConfirmed = m.status === 'confirmed';
            return `
            <div class="row" style="flex-wrap:wrap;gap:12px;">
              <div style="flex:1;min-width:240px;">
                <div class="row-title" style="font-size:14px;font-weight:700;">${window.escapeHtml(m.title || 'Founder Review Session')}</div>
                <div class="row-meta" style="margin-top:4px;">
                  Schedule: <strong>${window.escapeHtml(m.scheduledAt || 'Pending assignment')}</strong>
                  ${m.agenda ? `<div style="margin-top:4px;color:var(--ink-2);font-size:12px;">Agenda: ${window.escapeHtml(m.agenda)}</div>` : ''}
                </div>
                <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                  ${hasVideo ? `<a href="${window.escapeHtml(m.meetingUrl)}" target="_blank" class="primary" style="padding:6px 14px;font-size:11px;">📹 Join Video Call →</a>` : ''}
                  <button type="button" class="secondary" style="padding:6px 12px;font-size:11px;" onclick="window.addMeetingToGoogleCal('${m.id}')">📅 Add to Google Calendar</button>
                  <button type="button" class="secondary" style="padding:6px 12px;font-size:11px;" onclick="window.downloadMeetingIcs('${m.id}')">📥 .ics Invite</button>
                </div>
              </div>
              <span class="badge ${isConfirmed ? 'badge-success' : 'badge-warning'}">${m.status || 'Pending'}</span>
            </div>
          `;}).join('')}
        </div>
      `}
    `;
  }

  window.openMeetingRequestModal = function (appId) {
    const modalHtml = `
      <div class="auth-overlay open" id="meetingModal" role="dialog">
        <div class="auth-card" style="max-width:480px;">
          <button class="auth-close" type="button" onclick="document.getElementById('meetingModal').remove()">×</button>
          <div class="eyebrow">Request a Session</div>
          <h3>Schedule a Conversation</h3>
          <p>Propose a preferred date and topics you'd like to discuss with the Ideacubator team.</p>
          <form id="meetingRequestForm" style="display:grid;gap:14px;margin-top:16px;">
            <div class="field">
              <label class="label">Preferred Date</label>
              <input type="date" id="reqDate" required min="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="field">
              <label class="label">Preferred Time Slot</label>
              <select id="reqTime" required>
                <option value="10:00 AM IST">10:00 AM – 10:45 AM IST</option>
                <option value="02:00 PM IST">02:00 PM – 02:45 PM IST</option>
                <option value="05:00 PM IST">05:00 PM – 05:45 PM IST</option>
                <option value="08:00 PM IST">08:00 PM – 08:45 PM IST</option>
              </select>
            </div>
            <div class="field">
              <label class="label">Agenda / Discussion Focus</label>
              <textarea id="reqAgenda" placeholder="What specific feedback, architectural question, or partnership topic do you want to cover?"></textarea>
            </div>
            <button type="submit" class="primary" style="margin-top:8px;">Submit Meeting Request</button>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('meetingRequestForm').onsubmit = async (e) => {
      e.preventDefault();
      const date = document.getElementById('reqDate').value;
      const slot = document.getElementById('reqTime').value;
      const agenda = document.getElementById('reqAgenda').value;

      try {
        const db = window.IC_FIREBASE.db;
        await db.collection('meetings').add({
          applicationId: appId,
          applicantUid: currentUser.uid,
          title: 'Founder Strategy Session',
          scheduledAt: `${date} ${slot}`,
          agenda: agenda,
          status: 'requested',
          createdBy: currentUser.displayName || currentUser.email || 'founder',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        document.getElementById('meetingModal').remove();
        window.portalToast('Meeting request submitted!', 'success');
      } catch (err) {
        console.error('Failed to request meeting:', err);
        window.portalToast('Error requesting meeting: ' + err.message, 'error');
      }
    };
  };

  window.addMeetingToGoogleCal = function (meetingId) {
    const meeting = currentMeetings.find(m => m.id === meetingId);
    if (!meeting) {
      window.portalToast('Meeting not found', 'error');
      return;
    }
    if (window.IC_COMMS && window.IC_COMMS.getGoogleCalendarUrl) {
      const url = window.IC_COMMS.getGoogleCalendarUrl({
        title: meeting.title || 'Ideacubator Partner Review Session',
        description: meeting.agenda || 'Diligence and technical review with Ideacubator.',
        videoCallUrl: meeting.meetingUrl || 'https://meet.google.com/ideacubator',
        startDate: meeting.scheduledAt ? new Date(meeting.scheduledAt) : new Date()
      });
      window.open(url, '_blank');
    }
  };

  window.downloadMeetingIcs = function (meetingId) {
    const meeting = currentMeetings.find(m => m.id === meetingId);
    if (!meeting) {
      window.portalToast('Meeting not found', 'error');
      return;
    }
    if (window.IC_COMMS && window.IC_COMMS.downloadIcsFile) {
      window.IC_COMMS.downloadIcsFile({
        id: meeting.id,
        title: meeting.title || 'Ideacubator Partner Review Session',
        description: meeting.agenda || 'Diligence and technical review with Ideacubator.',
        videoCallUrl: meeting.meetingUrl || 'https://meet.google.com/ideacubator',
        startDate: meeting.scheduledAt ? new Date(meeting.scheduledAt) : new Date(),
        founderName: currentUser ? (currentUser.displayName || currentUser.email) : 'Founder',
        founderEmail: currentUser ? currentUser.email : 'team@ideacubator.in'
      });
      window.portalToast('Calendar invite (.ics) downloaded!', 'success');
    }
  };

  // ── TASKS STREAM ──
  function bindTasksStream(appId) {
    const db = window.IC_FIREBASE?.db;
    if (!db) return;

    if (unsubscribeTasks) unsubscribeTasks();

    const tasksCard = document.getElementById('tasks');
    if (!tasksCard) return;

    unsubscribeTasks = db.collection('tasks')
      .where('applicationId', '==', appId)
      .onSnapshot((snapshot) => {
        const tasks = [];
        snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));

        renderTasksCard(tasksCard, tasks);
      }, (err) => {
        console.error('Tasks error:', err);
      });
  }

  function renderTasksCard(container, tasks) {
    container.innerHTML = `
      <div class="eyebrow">Next Steps</div>
      <h3 style="font-size:22px;margin:5px 0 12px;">Tasks & Action Items</h3>

      ${tasks.length === 0 ? `
        <div class="empty" style="padding:24px;text-align:center;color:var(--ink-3);background:var(--paper);border-radius:12px;">
          No active tasks assigned. Next steps identified during review or meetings will be logged here.
        </div>
      ` : `
        <div class="list">
          ${tasks.map(t => {
            const isCompleted = t.status === 'completed';
            return `
              <div class="row" style="opacity:${isCompleted ? '0.6' : '1'}">
                <div style="display:flex;gap:12px;align-items:flex-start;">
                  <input type="checkbox" ${isCompleted ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}', this.checked)" style="width:18px;height:18px;margin-top:2px;cursor:pointer;">
                  <div>
                    <div class="row-title" style="text-decoration:${isCompleted ? 'line-through' : 'none'};">${window.escapeHtml(t.title)}</div>
                    <div class="row-meta">${window.escapeHtml(t.description || '—')}</div>
                    ${t.dueAt ? `<div class="row-meta" style="color:var(--brown);font-weight:600;">Due: ${formatTimestamp(t.dueAt)}</div>` : ''}
                  </div>
                </div>
                <span class="badge ${isCompleted ? 'badge-success' : 'badge-warning'}">${isCompleted ? 'Done' : 'Pending'}</span>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  }

  window.toggleTaskStatus = async function (taskId, isCompleted) {
    try {
      const db = window.IC_FIREBASE.db;
      await db.collection('tasks').doc(taskId).update({
        status: isCompleted ? 'completed' : 'pending',
        completedAt: isCompleted ? firebase.firestore.FieldValue.serverTimestamp() : null
      });
      window.portalToast('Task updated.', 'success');
    } catch (err) {
      console.error('Failed to update task:', err);
      window.portalToast('Could not update task: ' + err.message, 'error');
    }
  };

  // ── DOCUMENTS LIST & UPLOAD ──
  function renderDocumentsList(docs) {
    const docsCard = document.getElementById('documents');
    if (!docsCard) return;

    docsCard.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:16px;">
        <div>
          <div class="eyebrow">Documents</div>
          <h3 style="font-size:22px;margin:4px 0 0;">Files & Materials</h3>
        </div>
        <label class="primary" style="cursor:pointer;margin:0;">
          <span>+ Add Document</span>
          <input type="file" id="suppDocInput" style="display:none;" accept=".pdf,.doc,.docx,.ppt,.pptx" onchange="uploadSupplementaryDoc(this.files)">
        </label>
      </div>

      ${docs.length === 0 ? `
        <div class="empty" style="padding:28px;text-align:center;color:var(--ink-3);background:var(--paper);border-radius:12px;">
          No documents attached yet. Click "+ Add Document" to upload a pitch deck, architecture overview, or financial model.
        </div>
      ` : `
        <div class="list">
          ${docs.map(doc => `
            <div class="row">
              <div>
                <div class="row-title">📄 ${window.escapeHtml(doc.name)}</div>
                <div class="row-meta">${window.formatFileSize(doc.size)} · Uploaded ${formatTimestamp(doc.uploadedAt)}</div>
              </div>
              <div>
                ${doc.downloadUrl ? `
                  <a href="${window.escapeHtml(doc.downloadUrl)}" target="_blank" class="secondary" style="padding:6px 12px;font-size:11px;">Download ↗</a>
                ` : `<span class="badge">Attached</span>`}
              </div>
            </div>
          `).join('')}
        </div>
      `}
    `;
  }

  window.uploadSupplementaryDoc = async function (files) {
    if (!files || files.length === 0 || !currentApp) return;
    const file = files[0];
    const storage = window.IC_FIREBASE?.storage;
    const db = window.IC_FIREBASE?.db;

    if (!storage || !db) {
      window.portalToast('Storage service is currently unavailable.', 'error');
      return;
    }

    window.portalToast(`Uploading ${file.name}…`, 'info');

    try {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `applications/${currentApp.id}/documents/${Date.now()}_${sanitizedName}`;
      const storageRef = storage.ref(storagePath);

      const metadata = {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          applicantUid: currentUser.uid,
          applicationId: currentApp.id,
          originalName: file.name
        }
      };

      const snapshot = await storageRef.put(file, metadata);
      let downloadUrl = '';
      try {
        downloadUrl = await snapshot.ref.getDownloadURL();
      } catch (e) {
        console.warn('Direct URL lookup deferred:', e);
      }

      const newDocRecord = {
        name: file.name,
        storagePath: storagePath,
        downloadUrl: downloadUrl,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString()
      };

      // Add to Firestore application documents array
      await db.collection('applications').doc(currentApp.id).update({
        documents: firebase.firestore.FieldValue.arrayUnion(newDocRecord),
        'metadata.updatedAt': firebase.firestore.FieldValue.serverTimestamp()
      });

      window.portalToast('Document uploaded successfully!', 'success');
    } catch (err) {
      console.error('File upload failed:', err);
      window.portalToast('Failed to upload document: ' + err.message, 'error');
    }
  };

  // Sign out helper
  window.signOutWorkspace = async function () {
    if (window.IC_AUTH) {
      await window.IC_AUTH.signOut();
    }
    window.location.href = (window.IC_CONFIG && window.IC_CONFIG.routes && window.IC_CONFIG.routes.home) || '../index.html';
  };

  // Bootstrap
  document.addEventListener('DOMContentLoaded', initDashboard);
})();
