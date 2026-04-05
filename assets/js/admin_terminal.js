/**
 * Admin Terminal Logic for Ideacubator
 * Restoring all features from admin_functional.html
 */

let allApplications = [];
let allInvestors = [];
let currentTab = 'applications';

document.addEventListener('DOMContentLoaded', () => {
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Elements
    const loginScreen = document.getElementById('login-screen');
    const adminTerminal = document.getElementById('admin-terminal');
    const loginForm = document.getElementById('admin-login-form');
    const loginError = document.getElementById('login-err');
    
    // Auth State
    auth.onAuthStateChanged(user => {
        if (user && user.email.endsWith('@ideacubator.in')) {
            loginScreen.style.display = 'none';
            adminTerminal.style.display = 'flex';
            const viewport = document.getElementById('viewport');
            if (viewport) viewport.style.display = 'flex';
            loadData();
        } else {
            loginScreen.style.display = 'flex';
            adminTerminal.style.display = 'none';
            const viewport = document.getElementById('viewport');
            if (viewport) viewport.style.display = 'none';
            if (user) {
                loginError.innerText = "Error: Unauthorized domain. Access denied.";
                loginError.style.display = 'block';
                auth.signOut();
            }
        }
    });

    // Login Action
    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const em = document.getElementById('admin-email').value;
            const ps = document.getElementById('admin-pass').value;
            loginError.style.display = 'none';

            try {
                await auth.signInWithEmailAndPassword(em, ps);
            } catch (err) {
                loginError.innerText = "Access Forbidden: " + err.message;
                loginError.style.display = 'block';
            }
        };
    }

    // Tab Switching
    window.switchView = (view) => {
        currentTab = view;
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        document.getElementById('view-title-text').innerText = view === 'applications' ? 'Founder Applications' : 'Investor Inquiries';
        
        // Show/hide filter bar
        document.getElementById('filter-row').style.display = view === 'applications' ? 'flex' : 'none';
        
        renderTable();
    };

    // Logout Button
    window.terminateSession = () => auth.signOut();

    async function loadData() {
        try {
            console.log('Fetching operations data...');
            const [appSnap, invSnap] = await Promise.all([
                db.collection('applications').orderBy('submittedAt', 'desc').get(),
                db.collection('investorInquiries').orderBy('submittedAt', 'desc').get()
            ]);

            allApplications = appSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            allInvestors = invSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            renderStats();
            renderTable();
        } catch (err) {
            console.error('Data load failed:', err);
        }
    }

    function renderStats() {
        const apps = allApplications;
        const pendingCount = apps.filter(a => !a.status || a.status === 'submitted' || a.status === 'under_review').length;
        
        // Approved this month (Parity with admin_functional)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const approvedThisMonth = apps.filter(app => {
            if (app.status !== 'approved') return false;
            if (!app.submittedAt) return false;
            const date = app.submittedAt.toDate();
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        }).length;

        document.getElementById('stat-total-apps').innerText = apps.length;
        document.getElementById('stat-total-investors').innerText = allInvestors.length;
        document.getElementById('stat-pending').innerText = pendingCount;
        document.getElementById('stat-approved-month').innerText = approvedThisMonth;
    }

    function renderTable() {
        const tbody = document.getElementById('terminal-table-body');
        const thead = document.getElementById('terminal-table-head');

        if (currentTab === 'applications') {
            thead.innerHTML = `
                <tr>
                    <th>Received</th>
                    <th>Founder</th>
                    <th>Tech Profile</th>
                    <th>Rating</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            `;

            // Apply Filters (Parity with admin_functional)
            const statusFilter = document.getElementById('filterStatus').value;
            const ratingFilter = document.getElementById('filterRating').value;
            
            let filtered = allApplications;
            if (statusFilter !== 'all') filtered = filtered.filter(a => a.status === statusFilter);
            if (ratingFilter !== 'all') {
                const minRating = parseInt(ratingFilter);
                filtered = filtered.filter(a => (a.rating || 0) >= minRating);
            }

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:60px; opacity:.4">No founders match your filters.</td></tr>';
                return;
            }

            tbody.innerHTML = filtered.map(app => {
                const dateStr = app.submittedAt ? app.submittedAt.toDate().toLocaleDateString() : '-';
                const rating = app.rating || 0;
                const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
                const statusClass = getStatusClass(app.status);
                
                return `
                    <tr>
                        <td style="font-family:monospace; opacity:.5">${dateStr}</td>
                        <td>
                            <div style="font-weight:600; color:#fff">${app.founderName || app.email?.split('@')[0] || 'Anonymous'}</div>
                            <div style="font-size:11px; opacity:.4">${app.email || app.founderEmail || '-'}</div>
                        </td>
                        <td><span class="badge badge-blue">${app.profileLabel || app.profileSelected || app.profile || '-'}</span></td>
                        <td style="color:#f59e0b; letter-spacing:1px">${stars}</td>
                        <td><span class="badge ${statusClass}">${(app.status || 'submitted').replace('_', ' ')}</span></td>
                        <td><button class="term-btn-small" onclick="openPanel('applications', '${app.id}')">View Briefing</button></td>
                    </tr>
                `;
            }).join('');
        } else {
            thead.innerHTML = `
                <tr>
                    <th>Received</th>
                    <th>Investor</th>
                    <th>Range</th>
                    <th>Interest</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            `;

            if (allInvestors.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:60px; opacity:.4">No investor leads found.</td></tr>';
                return;
            }

            tbody.innerHTML = allInvestors.map(inv => {
                const dateStr = inv.submittedAt ? inv.submittedAt.toDate().toLocaleDateString() : '-';
                const statusClass = getStatusClass(inv.status);
                return `
                    <tr>
                        <td style="font-family:monospace; opacity:.5">${dateStr}</td>
                        <td>
                            <div style="font-weight:600; color:#fff">${inv.name || inv.fullName || '-'}</div>
                            <div style="font-size:11px; opacity:.4">${inv.email}</div>
                        </td>
                        <td><span class="badge badge-blue">${inv.investmentRange || inv.range || '-'}</span></td>
                        <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap">${inv.sectors || '-'}</td>
                        <td><span class="badge ${statusClass}">${(inv.status || 'pending')}</span></td>
                        <td><button class="term-btn-small" onclick="openPanel('investors', '${inv.id}')">View Profile</button></td>
                    </tr>
                `;
            }).join('');
        }
    }

    function getStatusClass(status) {
        if (!status) return 'badge-blue';
        if (['approved', 'invested'].includes(status)) return 'badge-green';
        if (['rejected', 'closed'].includes(status)) return 'badge-red';
        if (['under_review', 'meeting_scheduled', 'due_diligence'].includes(status)) return 'badge-yellow';
        return 'badge-blue';
    }

    // Filter Trigger
    window.applyFilters = () => renderTable();
    window.clearFilters = () => {
        document.getElementById('filterStatus').value = 'all';
        document.getElementById('filterRating').value = 'all';
        renderTable();
    };

    // Panel Logic
    window.openPanel = async (type, id) => {
        const overlay = document.getElementById('panel-overlay');
        const container = document.getElementById('panel-body');
        const item = type === 'applications' ? allApplications.find(a => a.id === id) : allInvestors.find(i => i.id === id);
        
        if (!item) return;

        container.innerHTML = `
            <div style="margin-bottom:40px">
                <div class="view-title" style="font-size:32px; margin-bottom:12px">${type === 'applications' ? 'Founder Briefing' : 'Investor Profile'}</div>
                <div style="font-size:12px; color:var(--term-text-muted)">Record ID: ${id}</div>
            </div>

            <div class="field-group">
                <div class="stat-label" style="margin-bottom:16px; color:var(--term-accent)">Primary Information</div>
                <div style="margin-bottom:20px">
                    <label class="stat-label" style="font-size:10px">Full Name</label>
                    <div style="font-size:16px; font-weight:600; color:#fff">${item.founderName || item.name || item.fullName || '-'}</div>
                </div>
                <div style="margin-bottom:20px">
                    <label class="stat-label" style="font-size:10px">Direct Contact</label>
                    <div style="font-size:16px; color:#fff">${item.email || item.founderEmail || '-'}</div>
                </div>
            </div>

            ${type === 'applications' ? buildAppFields(item) : buildInvFields(item)}

            <div style="margin-top:48px; padding-top:32px; border-top:1px solid var(--term-border)">
                <div class="stat-label" style="margin-bottom:20px; color:var(--term-accent)">Operational Control</div>
                
                ${type === 'applications' ? `
                    <label class="stat-label" style="font-size:10px">Internal Priority</label>
                    <div style="display:flex; gap:8px; margin-bottom:24px; font-size:24px; color:#f59e0b">
                        ${[1,2,3,4,5].map(n => `<span style="cursor:pointer" onclick="updateRating('${id}', ${n})">${n <= (item.rating||0) ? '★' : '☆'}</span>`).join('')}
                    </div>
                ` : ''}

                <label class="stat-label" style="font-size:10px">Pipeline Status</label>
                <select class="term-select" style="width:100%; margin-bottom:24px" onchange="updateStatus('${type}', '${id}', this.value)">
                    ${getStatusOptions(type, item.status)}
                </select>

                <label class="stat-label" style="font-size:10px">Internal Notes</label>
                <textarea class="term-input" id="reviewer-comments" style="width:100%; height:120px; margin-bottom:20px" placeholder="Enter tech-due-diligence notes...">${item.reviewerComments || ''}</textarea>
                <button class="btn-primary" style="width:100%; justify-content:center" onclick="saveComments('${type}', '${id}')">Save Updates</button>
            </div>
        `;

        overlay.classList.add('open');
    };

    window.closePanel = () => document.getElementById('panel-overlay').classList.remove('open');

    function buildAppFields(app) {
        const data = app.data || {};
        return `<div class="field-group">
            <div class="stat-label" style="margin-top:32px; margin-bottom:16px; color:var(--term-accent)">Submission Details</div>
            ${Object.keys(data).filter(k => !k.startsWith('_')).map(k => `
                <div style="margin-bottom:16px">
                    <label class="stat-label" style="font-size:9px">${k.replace(/_/g, ' ').toUpperCase()}</label>
                    <div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.5">${data[k]}</div>
                </div>
            `).join('')}
        </div>`;
    }

    function buildInvFields(inv) {
        const exclude = ['name', 'fullName', 'email', 'status', 'id', 'submittedAt', 'type'];
        return `<div class="field-group">
             <div class="stat-label" style="margin-top:32px; margin-bottom:16px; color:var(--term-accent)">Investment Thesis</div>
             ${Object.keys(inv).filter(k => !exclude.includes(k)).map(k => `
                 <div style="margin-bottom:16px">
                     <label class="stat-label" style="font-size:9px">${k.replace(/([A-Z])/g, ' $1').toUpperCase()}</label>
                     <div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.5">${inv[k]}</div>
                 </div>
             `).join('')}
         </div>`;
    }

    function getStatusOptions(type, current) {
        const appOpts = ['submitted', 'under_review', 'meeting_scheduled', 'due_diligence', 'approved', 'rejected', 'invested', 'incubation', 'closed'];
        const invOpts = ['pending', 'approved', 'rejected'];
        const list = type === 'applications' ? appOpts : invOpts;
        return list.map(opt => `<option value="${opt}" ${current === opt ? 'selected' : ''}>${opt.replace('_', ' ').toUpperCase()}</option>`).join('');
    }

    window.updateRating = async (id, n) => {
        await db.collection('applications').doc(id).update({ rating: n });
        const app = allApplications.find(a => a.id === id); if(app) app.rating = n;
        renderTable();
        openPanel('applications', id); // Refresh panel
    };

    window.updateStatus = async (type, id, s) => {
        const collection = type === 'applications' ? 'applications' : 'investorInquiries';
        await db.collection(collection).doc(id).update({ status: s });
        const list = type === 'applications' ? allApplications : allInvestors;
        const item = list.find(x => x.id === id); if(item) item.status = s;
        renderTable();
        renderStats();
    };

    window.saveComments = async (type, id) => {
        const comments = document.getElementById('reviewer-comments').value;
        const collection = type === 'applications' ? 'applications' : 'investorInquiries';
        await db.collection(collection).doc(id).update({ reviewerComments: comments });
        const list = type === 'applications' ? allApplications : allInvestors;
        const item = list.find(x => x.id === id); if(item) item.reviewerComments = comments;
        console.log('✅ Updates saved to internal record.');
    };
});
