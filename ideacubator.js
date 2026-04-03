/*!
 * Ideacubator – App JS
 */
document.addEventListener('DOMContentLoaded', () => {
    // ─────────────────────────────────────────────────────────
    // FIREBASE CONFIG
    // ─────────────────────────────────────────────────────────
    const firebaseConfig = {
        apiKey: "AIzaSyDHPuZ7fAXInpVSPF5Ki7qJwBYfRUlJ2A4",
        authDomain: "rational-world-330006.firebaseapp.com",
        projectId: "rational-world-330006",
        storageBucket: "rational-world-330006.firebasestorage.app",
        messagingSenderId: "115200442212",
        appId: "1:115200442212:web:b2cd9d4d48738da9ed4471",
        measurementId: "G-GJ77HJH9TQ"
    };

    // Initialize Firebase using compat version (v8 syntax)
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // ─────────────────────────────────────────────────────────
    // Dynamic Form Configuration
    // ─────────────────────────────────────────────────────────
    const commonCore = [
        { id: 'founderName', label: 'Full Name *', type: 'text', col: 'col-md-6', required: true, placeholder: 'Your full name' },
        { id: 'founderEmail', label: 'Email Address *', type: 'email', col: 'col-md-6', required: true, placeholder: 'you@company.com' },
        { id: 'founderPhone', label: 'Phone / WhatsApp', type: 'tel', col: 'col-md-6', placeholder: '+91 XXXXX XXXXX' },
        { id: 'founderLinkedIn', label: 'LinkedIn Profile', type: 'url', col: 'col-md-6', placeholder: 'https://linkedin.com/in/...' }
    ];

    const formConfig = {
        'college': [
            {
                title: 'Founder Information', fields: [...commonCore,
                { id: 'collegeName', label: 'College / University *', type: 'text', col: 'col-md-8', required: true },
                { id: 'gradYear', label: 'Graduation Year', type: 'text', col: 'col-md-4' }
                ]
            },
            {
                title: 'Idea Details', fields: [
                    { id: 'ideaName', label: 'Idea Name *', type: 'text', col: 'col-12', required: true },
                    { id: 'ideaSummary', label: 'Idea Summary (Problem & Solution) *', type: 'textarea', col: 'col-12', required: true, rows: 4 },
                    { id: 'pitchDeck', label: 'Pitch Deck / Profile (URL)', type: 'url', col: 'col-12', placeholder: 'https://drive.google.com/... or notion.so/...' }
                ]
            }
        ],
        'employed': [
            {
                title: 'Founder Information', fields: [...commonCore,
                { id: 'currentRole', label: 'Current Role & Employer *', type: 'text', col: 'col-12', required: true }
                ]
            },
            {
                title: 'Venture Details', fields: [
                    { id: 'ideaName', label: 'Idea Name *', type: 'text', col: 'col-12', required: true },
                    { id: 'ideaSummary', label: 'Idea Summary *', type: 'textarea', col: 'col-12', required: true, rows: 3 },
                    { id: 'whyUs', label: 'Why do you need us to build/run it? *', type: 'textarea', col: 'col-12', required: true, rows: 3 },
                    { id: 'domainExpertiseUrl', label: 'Proof of Domain Expertise (URL)', type: 'url', col: 'col-12', placeholder: 'LinkedIn, portfolio, or Drive link' }
                ]
            }
        ],
        'mvp': [
            { title: 'Founder Information', fields: commonCore },
            {
                title: 'Traction & Funding', fields: [
                    { id: 'ventureName', label: 'Venture Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'mvpLink', label: 'MVP Link / Demo URL *', type: 'url', col: 'col-md-6', required: true },
                    { id: 'fundingAsk', label: 'Seed Funding Ask *', type: 'text', col: 'col-md-6', required: true, placeholder: '₹ ...' },
                    { id: 'traction', label: 'Current Traction (Users/Revenue)', type: 'textarea', col: 'col-12', rows: 3 },
                    { id: 'businessPlanFile', label: 'Business Plan / Pitch Deck (URL)', type: 'url', col: 'col-12', placeholder: 'Google Drive, Dropbox, or Notion link' }
                ]
            }
        ],
        'revenue': [
            { title: 'Founder Information', fields: commonCore },
            {
                title: 'Metrics & Capital', fields: [
                    { id: 'productName', label: 'Product Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'productUrl', label: 'Product URL *', type: 'url', col: 'col-md-6', required: true },
                    { id: 'arr', label: 'Current ARR *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'vcAsk', label: 'VC Funding Ask *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'capTableLink', label: 'CAP Table / Financials (URL)', type: 'url', col: 'col-12', placeholder: 'Drive, Dropbox, or Notion link' },
                    { id: 'pitchDeckFile', label: 'Pitch Deck (URL)', type: 'url', col: 'col-12', placeholder: 'Google Drive or Notion link' }
                ]
            }
        ],
        'sell': [
            { title: 'Your Information', fields: commonCore },
            {
                title: 'Business Details', fields: [
                    { id: 'businessName', label: 'Business Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'yearsActive', label: 'Years in Operation *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'annualRev', label: 'Annual Revenue *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'askingPrice', label: 'Asking Price / Valuation *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'whySelling', label: 'Reason for Selling *', type: 'textarea', col: 'col-12', required: true, rows: 3 },
                    { id: 'plFile', label: 'P&L Statement (URL)', type: 'url', col: 'col-12', placeholder: 'Google Drive or Dropbox link' }
                ]
            }
        ],
        'ipo': [
            { title: 'Executive Information', fields: commonCore },
            {
                title: 'Company Details', fields: [
                    { id: 'companyName', label: 'Company Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'targetExchange', label: 'Target Exchange (BSE/NSE/Etc) *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'lastRev', label: 'Last Year Revenue *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'auditor', label: 'Current Auditor / Firm', type: 'text', col: 'col-md-6' },
                    { id: 'financialsLink', label: 'Audited Financials (URL) *', type: 'url', col: 'col-12', required: true, placeholder: 'Drive or Notion link' }
                ]
            }
        ],
        'test': [
            { title: 'Founder Information', fields: commonCore },
            {
                title: 'Testing Requirements', fields: [
                    { id: 'ideaSummary', label: 'Idea to Validate *', type: 'textarea', col: 'col-12', required: true, rows: 3 },
                    { id: 'targetAudience', label: 'Target Audience *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'testBudget', label: 'Test Budget (Out of Pocket)', type: 'text', col: 'col-md-6' },
                    { id: 'mockupFile', label: 'Mockups / Designs (URL)', type: 'url', col: 'col-12', placeholder: 'Drive, Dropbox, or Figma link' }
                ]
            }
        ],
        'valuation': [
            { title: 'Founder Information', fields: commonCore },
            {
                title: 'Valuation Context', fields: [
                    { id: 'businessName', label: 'Business Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'industry', label: 'Industry *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'avgRevenue', label: 'Avg 3-Year Revenue *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'valuationReason', label: 'Reason for Valuation (M&A, Funding, Internal) *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'financialsFile', label: 'Financial Summary (URL)', type: 'url', col: 'col-12', placeholder: 'Google Drive or Notion link' }
                ]
            }
        ],
        'domestic_int': [
            { title: 'Corporate Information', fields: commonCore },
            {
                title: 'Expansion Goals', fields: [
                    { id: 'companyName', label: 'Company Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'productCategory', label: 'Product Category *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'currentGeo', label: 'Current Domestic Footprint *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'targetGeo', label: 'Target International Markets *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'website', label: 'Company Website *', type: 'url', col: 'col-12', required: true },
                    { id: 'profileFile', label: 'Company Profile (URL)', type: 'url', col: 'col-12', placeholder: 'Google Drive or Notion link' }
                ]
            }
        ],
        'int_domestic': [
            { title: 'Corporate Information', fields: commonCore },
            {
                title: 'India Entry Goals', fields: [
                    { id: 'companyName', label: 'Company Name *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'originCountry', label: 'Country of Origin *', type: 'text', col: 'col-md-6', required: true },
                    { id: 'indiaTarget', label: 'India Target Market Segment *', type: 'text', col: 'col-12', required: true },
                    { id: 'collabModel', label: 'Preferred Collaboration Model (JV, Reseller, Tech Transfer) *', type: 'text', col: 'col-12', required: true },
                    { id: 'website', label: 'Company Website *', type: 'url', col: 'col-12', required: true },
                    { id: 'profileFile', label: 'Company Profile (URL)', type: 'url', col: 'col-12', placeholder: 'Google Drive or Notion link' }
                ]
            }
        ]
    };

    // Form initialization (call after content loads)
    function initApplicationForm() {
      const selector = document.getElementById('profileSelector');
      const formContainer = document.getElementById('dynamicFormFields');
      const theForm = document.getElementById('dynamicForm');

      if (!selector || !theForm) {
        // Form not present on this page
        return;
      }

      // Remove any existing listeners to avoid duplicates
      selector.removeEventListener('change', handleFormChange);
      theForm.removeEventListener('submit', handleFormSubmit);

      selector.addEventListener('change', handleFormChange);
      theForm.addEventListener('submit', handleFormSubmit);
    }

    async function handleFormChange(e) {
      const profile = e.target.value;
      if (!profile || !formConfig[profile]) return;

      const theForm = document.getElementById('dynamicForm');
      if (!theForm) return;

      theForm.style.display = 'block';

      let html = '';
      formConfig[profile].forEach(group => {
        html += `<div class="form-group-label-section">${group.title}</div><div class="row g-4 mb-4">`;
        group.fields.forEach(f => {
          html += `<div class="${f.col}"><label class="form-label">${f.label}</label>`;
          if (f.type === 'textarea') {
            html += `<textarea id="${f.id}" class="form-control" rows="${f.rows || 3}" ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} ${f.required ? 'required' : ''}></textarea>`;
          } else if (f.type === 'file') {
            html += `<input type="file" id="${f.id}" class="form-control" accept="${f.accept || ''}" ${f.required ? 'required' : ''}>`;
            if (f.note) html += `<small class="text-muted d-block mt-1" style="font-size:0.75rem;">${f.note}</small>`;
          } else {
            html += `<input type="${f.type}" id="${f.id}" class="form-control" ${f.placeholder ? `placeholder="${f.placeholder}"` : ''} ${f.required ? 'required' : ''}>`;
          }
          html += `</div>`;
        });
        html += `</div>`;
      });

      html += `<div class="row g-4 mt-2 mb-4"><div class="col-12"><div class="form-check">
                  <input class="form-check-input" type="checkbox" id="govCheck" required>
                  <label class="form-check-label" for="govCheck">I confirm that all information provided is accurate and I understand Ideacubator operates with defined governance structures.</label>
               </div></div></div>`;

      const formContainer = document.getElementById('dynamicFormFields');
      if (formContainer) formContainer.innerHTML = html;
    }

    async function handleFormSubmit(e) {
      e.preventDefault();
      const form = e.target;
      const btn = form.querySelector('.btn--primary');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting…';
      }

      const profile = document.getElementById('profileSelector')?.value;
      if (!profile) return;

      const application = {
        profileSelected: profile,
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'submitted',
        source: 'ideacubator.in'
      };

      const formContainer = document.getElementById('dynamicFormFields');
      if (!formContainer) return;

      const inputs = formContainer.querySelectorAll('input, select, textarea');
      inputs.forEach(el => {
        if (el.type === 'checkbox') {
          application[el.id] = el.checked;
        } else {
          if (el.value.trim() !== '') application[el.id] = el.value.trim();
        }
      });

      console.log('Submitting application to Firestore:', {
        profile: profile,
        fields: Object.keys(application)
      });

      try {
        const docRef = await db.collection('applications').add(application);
        console.log('✅ Application submitted successfully. Document ID:', docRef.id);

        form.style.display = 'none';
        const selectorContainer = document.querySelector('#apply .section__desc');
        if (selectorContainer) selectorContainer.style.display = 'none';
        const profileSelectContainer = document.getElementById('profileSelector')?.parentElement;
        if (profileSelectContainer) profileSelectContainer.style.display = 'none';

        const success = document.getElementById('form-success');
        if (success) {
          success.style.display = 'block';
          window.scrollTo({ top: success.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' });
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {
        console.error('❌ Firebase write failed:', err);
        console.error('Error details:', {
          code: err.code,
          message: err.message,
          name: err.name
        });

        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Submit Application';
        }

        let userMessage = 'Submission failed. ';
        if (err.code === 'permission-denied') {
          userMessage += 'Firebase security rules are blocking the write. Check Firestore permissions.';
        } else if (err.code === 'unavailable') {
          userMessage += 'Network error or Firebase is in offline mode.';
        } else if (err.code === 'invalid-argument') {
          userMessage += 'Invalid data format (possibly file too large or corrupt).';
        } else if (err.code === 'resource-exhausted') {
          userMessage += 'Firestore quota exceeded or request too large.';
        } else {
          userMessage += 'Error: ' + err.message + '. Check browser console for details.';
        }

        alert(userMessage);
      }
    }

    // Initialize form on load
    initApplicationForm();

    // ─────────────────────────────────────────────────────────
    // FIREBASE AUTHENTICATION & USER MANAGEMENT
    // ─────────────────────────────────────────────────────────
    const googleProvider = new firebase.auth.GoogleAuthProvider();

    // DOM Elements
    const googleSignInBtn = document.getElementById('google-signin-btn');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardLink = document.querySelector('.nav__dashboard-link');

    // Show/hide navbar buttons based on auth state
    function updateAuthUI(user) {
        if (loginBtn) {
            loginBtn.style.display = user ? 'none' : 'inline-flex';
        }
        if (dashboardLink) {
            dashboardLink.style.display = user ? 'inline-flex' : 'none';
        }
        if (logoutBtn) {
            logoutBtn.style.display = user ? 'inline-flex' : 'none';
        }
    }

    // Handle Google Sign-In
    googleSignInBtn?.addEventListener('click', async () => {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            console.log('✅ Google sign-in successful:', user.email);

            // No need to create user profile; we'll use email to query their data
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal?.hide();

            // Go to unified dashboard
            window.location.href = 'dashboard/founder.html';

        } catch (err) {
            console.error('❌ Sign-in failed:', err);
            alert('Sign-in failed: ' + err.message);
        }
    });

    // Logout handler
    logoutBtn?.addEventListener('click', async () => {
        try {
            await auth.signOut();
            console.log('✅ Signed out');
            window.location.href = 'index.html';
        } catch (err) {
            console.error('❌ Logout failed:', err);
        }
    });

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? user.email : 'signed out');
        updateAuthUI(user);

        if (user) {
            // If user is on admin page, check admin status
            const currentPage = window.location.pathname;
            if (currentPage.includes('/admin.html')) {
                // Admin check happens in admin.html itself
                return;
            }
            // Otherwise, they're on a dashboard page - nothing to do, dashboard loads own data
        }
    });

    // Redirect to dashboard (founder/investor unified)
    function redirectToDashboard(email) {
        window.location.href = 'dashboard/founder.html';
    }

    // Initialize: Check auth state on page load
    if (auth.currentUser) {
        updateAuthUI(auth.currentUser);
    }

    // ─────────────────────────────────────────────────────────
    AOS.init({ duration: 650, easing: 'ease-out-quad', once: true });

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const t = document.querySelector(a.getAttribute('href'));
            if (t) { e.preventDefault(); window.scrollTo({ top: t.offsetTop - 80, behavior: 'smooth' }); }
        });
    });

    // ─────────────────────────────────────────────────────────
    // FIREBASE CONNECTION TEST
    // ─────────────────────────────────────────────────────────
    console.log('Testing Firebase connection...');

    // Simple test: try to access the applications collection (doesn't require read if rules allow write only)
    try {
        // This will fail if Firestore is not initialized, but won't throw if just permission denied
        const testRef = db.collection('applications');
        console.log('✅ Firebase Firestore reference created successfully');
        console.log('Collection path:', testRef.path);

        // Optional: try a lightweight ping (will fail if rules deny, but connection works)
        // We'll just verify the SDK is initialized
    } catch (err) {
        console.error('❌ Firebase initialization error:', err);
    }
});
