// ── Firebase Configuration & Initialization ──
const firebaseConfig = {
    apiKey: "AIzaSyDHPuZ7fAXInpVSPF5Ki7qJwBYfRUlJ2A4",
    authDomain: "rational-world-330006.firebaseapp.com",
    projectId: "rational-world-330006",
    storageBucket: "rational-world-330006.firebasestorage.app",
    messagingSenderId: "115200442212",
    appId: "1:115200442212:web:b2cd9d4d48738da9ed4471",
    measurementId: "G-GJ77HJH9TQ"
};

// Initialize Firebase (compat v8 syntax)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ── Auth Wrapper (Now using real Firebase) ──
const Auth = {
    current() {
        const user = auth.currentUser;
        if (!user) return null;
        return {
            id: user.uid,
            name: user.displayName || 'User',
            email: user.email,
            avatar: (user.displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
            photoURL: user.photoURL
        };
    },
    signOut() {
        return auth.signOut();
    }
};

const Apps = {
    async save(app) {
        try {
            await db.collection('applications').add(app);
            console.log('✅ Application submitted to Firestore');
            return true;
        } catch (err) {
            console.error('❌ Firestore error:', err);
            throw err;
        }
    }
};

// ── Nav scroll ──
window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ── Navigation & Interactions ──
function initNav() {
    const ham = document.getElementById('ham');
    if (ham) {
        ham.onclick = () => document.getElementById('mobile-menu').classList.toggle('open');
    }
    
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
        authModal.onclick = e => { if (e.target === authModal) closeAuthModal(); };
    }

    // Refresh auth state in nav
    const mappedUser = Auth.current();
    updateNavAuth(mappedUser);
}

function closeMM() {
    const mm = document.getElementById('mobile-menu');
    if (mm) mm.classList.remove('open');
}

// ── Auth modal ──
let _afterAuth = null;
function openAuthModal(ctx) {
    _afterAuth = ctx;
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.add('open');
}
function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('open');
}


async function googleSignIn() {
    try {
        // Security Hardening: Ensure any existing session (admin or old user) is cleared
        // This prevents session crossing and the 'signed out' loop
        await auth.signOut();
        
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        console.log('✅ Google sign-in successful:', user.email);
        
        closeAuthModal();
        const mappedUser = Auth.current();
        updateNavAuth(mappedUser);
        
        if (_afterAuth === 'apply') {
            showApplyForm(mappedUser);
        } else if (_afterAuth === 'dashboard') {
            window.location.href = 'dashboard/founder.html';
        }
    } catch (err) {
        console.error('❌ Sign-in failed:', err);
        alert('Sign-in failed: ' + err.message);
    }
}

function handleTrackLink(e) {
    e.preventDefault();
    const u = Auth.current();
    if (u) window.location.href = 'dashboard/founder.html';
    else openAuthModal('dashboard');
}

function handleMobileAuth() {
    closeMM();
    const u = Auth.current();
    if (u) window.location.href = 'dashboard/founder.html';
    else openAuthModal('apply');
}

function updateNavAuth(user) {
    const area = document.getElementById('nav-auth-area');
    const mmBtn = document.getElementById('mm-auth-btn');
    if (!area || !mmBtn) return;

    if (user) {
        area.innerHTML = `
            <div class="nav-user-area">
                <button class="nav-user-btn" onclick="toggleUserDropdown(event)">
                    <div class="nav-avatar">${user.avatar}</div>
                    ${user.name.split(' ')[0]}
                </button>
                <div class="nav-user-dropdown" id="user-dropdown">
                    <a href="/founder.html" class="nav-dropdown-item">
                        <svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        Founder Dashboard
                    </a>
                    <div class="nav-dropdown-divider"></div>
                    <button class="nav-dropdown-item" onclick="handleSignOut()" style="width:100%;background:none;border:none;cursor:pointer">
                        <svg style="width:16px;height:16px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Sign Out
                    </button>
                </div>
            </div>`;
        mmBtn.textContent = 'My dashboard →';
    } else {
        area.innerHTML = '<a href="#apply" class="nav-cta">Tell us your idea</a>';
        mmBtn.textContent = 'Sign in with Google';
    }
}

function toggleUserDropdown(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.toggle('show');
}

// Global click to close dropdown
window.addEventListener('click', () => {
    const dd = document.getElementById('user-dropdown');
    if (dd && dd.classList.contains('show')) {
        dd.classList.remove('show');
    }
});

async function handleSignOut() {
    try {
        await auth.signOut();
        window.location.href = '/index.html';
    } catch (err) {
        console.error('Logout failed:', err);
    }
}

// ── Apply section ──
function showApplyForm(user) {
    const gate = document.getElementById('auth-gate');
    const form = document.getElementById('apply-form');
    if (gate) gate.style.display = 'none';
    if (form) {
        form.classList.add('visible');
        const userBar = document.getElementById('apply-user-bar');
        if (userBar) {
            userBar.innerHTML = `
                <div class="apply-user-info">
                  <div class="apply-user-avatar">${user.avatar}</div>
                  <div><div class="apply-user-name">${user.name}</div><div class="apply-user-email">${user.email}</div></div>
                </div>
                <button style="font-size:12px;color:rgba(255,255,255,.4);background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:4px" onclick="signOutApply()">Not you? Sign out</button>`;
        }
    }
}

async function signOutApply() {
    await Auth.signOut();
    const applyForm = document.getElementById('apply-form');
    const authGate = document.getElementById('auth-gate');
    const formSuccess = document.getElementById('form-success');
    const formBody = document.getElementById('apply-form-body');
    const profileSelect = document.getElementById('profile-select');
    const formFields = document.getElementById('form-fields');
    const formConsent = document.getElementById('form-consent');
    const btnSubmit = document.getElementById('btn-submit');
    const formAssurance = document.getElementById('form-assurance');

    if (applyForm) applyForm.classList.remove('visible');
    if (authGate) authGate.style.display = 'block';
    if (formSuccess) formSuccess.classList.remove('show');
    if (formBody) formBody.style.display = 'block';
    
    updateNavAuth(null);
    
    if (profileSelect) profileSelect.value = '';
    if (formFields) {
        formFields.classList.remove('show');
        formFields.innerHTML = '';
    }
    if (formConsent) formConsent.style.display = 'none';
    if (btnSubmit) btnSubmit.style.display = 'none';
    if (formAssurance) formAssurance.style.display = 'none';
}

// ── Form configs ──
const formConfigs={

  /* ── Form 1: College student ── */
  student:{label:'College student seeking investment',fields:[
    {id:'full_name',   label:'Full name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@gmail.com',                                     req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'linkedin',    label:'LinkedIn profile URL',            type:'url',     ph:'https://linkedin.com/in/yourname',                  req:false},
    {id:'college',     label:'College / University',            type:'text',    ph:'e.g. IIT Bombay',                                   req:true},
    {id:'grad_year',   label:'Expected graduation year',        type:'text',    ph:'e.g. 2026',                                         req:false},
    {id:'idea_stage',  label:'What stage is the idea at?',      type:'select',  ph:'',                                                  req:true,
     options:['Just an idea — nothing built yet','Done some research / customer conversations','Built a prototype or MVP']},
    {id:'idea_name',   label:'Idea name',                       type:'text',    ph:'What do you call it?',                              req:true},
    {id:'idea_summary',label:'What problem does it solve — and how?', type:'textarea', ph:'Describe the problem and your solution in 2–3 sentences. Be specific.', req:true},
    {id:'user_spoken', label:'Have you spoken to any potential users?', type:'select', ph:'', req:true,
     options:['No — not yet','Yes — a few informal conversations','Yes — structured interviews with 5+ people']},
    {id:'user_insights',label:'What did they tell you? (if applicable)', type:'textarea', ph:'What feedback or validation did you get? Write "not yet" if you haven\'t spoken to users.', req:false},
    {id:'deck_url',    label:'Pitch deck or profile (URL)',      type:'url',     ph:'Optional — Google Drive or Notion link',            req:false},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','College / campus event','Instagram or social media','Other']},
  ]},

  /* ── Form 2: Employed professional ── */
  professional:{label:'Employed professional with idea',fields:[
    {id:'full_name',   label:'Full name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@company.com',                                   req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'linkedin',    label:'LinkedIn profile URL',            type:'url',     ph:'https://linkedin.com/in/yourname — helps us verify your domain expertise', req:true},
    {id:'role_employer',label:'Current role & employer',        type:'text',    ph:'e.g. Senior PM, Infosys',                           req:true},
    {id:'time_per_week',label:'Hours per week you can dedicate to this',type:'select',ph:'',                                           req:true,
     options:['Less than 5 hours','5–10 hours','10–20 hours','More than 20 hours']},
    {id:'idea_name',   label:'Idea name',                       type:'text',    ph:'What do you call it?',                              req:true},
    {id:'idea_summary',label:'Describe the idea — what would you want our team to build?', type:'textarea', ph:'Explain the idea and what you need us to execute.', req:true},
    {id:'why_us',      label:'Why do you need us to build it?', type:'textarea', ph:'What is your role in this? Why can\'t you build it yourself right now?', req:true},
    {id:'expertise_url',label:'Proof of domain expertise (URL)',type:'url',     ph:'Optional — LinkedIn article, portfolio, or published work', req:false},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','College / campus event','Instagram or social media','Other']},
  ]},

  /* ── Form 3: Seed stage ── */
  seed:{label:'MVP built, seeking seed funding',fields:[
    {id:'full_name',   label:'Full name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourstartup.com',                               req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'linkedin',    label:'LinkedIn profile URL',            type:'url',     ph:'https://linkedin.com/in/yourname',                  req:false},
    {id:'venture_name',label:'Venture name',                    type:'text',    ph:'Your company or product name',                      req:true},
    {id:'team_size',   label:'Founders & team size',            type:'select',  ph:'',                                                  req:true,
     options:['Solo founder','2 co-founders','3 co-founders','4+ founding team']},
    {id:'mvp_url',     label:'MVP or demo URL',                 type:'url',     ph:'https://app.yourproduct.com',                       req:true},
    {id:'traction',    label:'Current traction',                type:'textarea', ph:'Users, revenue, key milestones — write "pre-revenue" or "zero users" if applicable. Be honest.', req:true},
    {id:'seed_ask',    label:'Seed funding ask',                type:'text',    ph:'e.g. ₹50L or $100K',                               req:true},
    {id:'use_of_funds',label:'What will the funding be used for?', type:'textarea', ph:'e.g. 6 months runway for 3 engineers, product and marketing spend', req:true},
    {id:'deck_url',    label:'Business plan / pitch deck (URL)',type:'url',     ph:'Strongly recommended — Google Drive, Notion, or Docsend link', req:false},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','Investor referral','Event or conference','Other']},
  ]},

  /* ── Form 4: VC stage ── */
  vc:{label:'Revenue-generating product, seeking VC funding',fields:[
    {id:'full_name',   label:'Full name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourcompany.com',                               req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'linkedin',    label:'LinkedIn profile URL',            type:'url',     ph:'https://linkedin.com/in/yourname',                  req:false},
    {id:'product_name',label:'Product / company name',          type:'text',    ph:'Your product or company name',                      req:true},
    {id:'product_url', label:'Product URL',                     type:'url',     ph:'https://yourproduct.com',                           req:true},
    {id:'team_size',   label:'Total employees (incl. founders)',type:'select',  ph:'',                                                  req:true,
     options:['1–5','6–15','16–30','31–50','51–100','100+']},
    {id:'arr',         label:'Current ARR',                     type:'text',    ph:'e.g. ₹2.4Cr or $300K',                            req:true},
    {id:'burn_rate',   label:'Monthly burn rate',               type:'text',    ph:'e.g. ₹18L/month — total monthly expenses',         req:true},
    {id:'vc_ask',      label:'VC funding ask',                  type:'text',    ph:'e.g. ₹5Cr or $600K',                               req:true},
    {id:'use_of_funds',label:'What will the funding be used for?', type:'textarea', ph:'e.g. Hire 8 engineers, expand to 3 new cities, double marketing spend', req:true},
    {id:'cap_table_url',label:'CAP table & financials (URL)',   type:'url',     ph:'Required for due diligence — please attach before submitting', req:true},
    {id:'deck_url',    label:'Pitch deck (URL)',                 type:'url',     ph:'Optional — Google Drive or Docsend',                req:false},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','Investor referral','Event or conference','Other']},
  ]},

  /* ── Form 5: Sell my business ── */
  sell:{label:'Looking to sell a running business',fields:[
    {id:'full_name',   label:'Your name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourbusiness.com',                              req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'linkedin',    label:'LinkedIn profile (optional)',      type:'url',     ph:'https://linkedin.com/in/yourname',                  req:false},
    {id:'biz_name',    label:'Business name',                   type:'text',    ph:'Your business name',                                req:true},
    {id:'biz_structure',label:'Business structure',             type:'select',  ph:'',                                                  req:true,
     options:['Private Limited (Pvt Ltd)','Limited Liability Partnership (LLP)','Partnership firm','Sole proprietorship','Public Limited','Other']},
    {id:'years_op',    label:'Years in operation',              type:'text',    ph:'e.g. 12',                                           req:true},
    {id:'employees',   label:'Number of employees',             type:'select',  ph:'',                                                  req:true,
     options:['1–10','11–25','26–50','51–100','100+']},
    {id:'annual_rev',  label:'Annual revenue (last FY)',         type:'text',    ph:'e.g. ₹3.5Cr',                                     req:true},
    {id:'asking_price',label:'Asking price',                    type:'text',    ph:'e.g. ₹12Cr — or "open to offers"',                 req:true},
    {id:'reason_selling',label:'Why are you selling?',          type:'textarea', ph:'A brief, honest explanation. We treat this with complete confidentiality.', req:true},
    {id:'pl_url',      label:'P&L statement (URL)',             type:'url',     ph:'Required — we cannot evaluate without financials. Google Drive or Dropbox link.', req:true},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','CA / advisor referral','Event or conference','Other']},
  ]},

  /* ── Form 6: IPO ── */
  ipo:{label:'Need help going IPO',fields:[
    {id:'full_name',   label:'Your name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourcompany.com',                               req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'linkedin',    label:'LinkedIn profile',                 type:'url',     ph:'https://linkedin.com/in/yourname',                  req:false},
    {id:'company_name',label:'Company name (legal)',            type:'text',    ph:'As registered with MCA',                            req:true},
    {id:'cin',         label:'CIN / Company Registration Number', type:'text',  ph:'e.g. U12345KA2012PTC123456',                       req:true},
    {id:'biz_structure',label:'Company type',                   type:'select',  ph:'',                                                  req:true,
     options:['Private Limited — seeking conversion to Public','Already Public Limited','LLP — seeking restructure']},
    {id:'target_exchange',label:'Target exchange',              type:'select',  ph:'',                                                  req:true,
     options:['BSE SME','NSE Emerge','BSE Mainboard','NSE Mainboard','NASDAQ / NYSE (US)','Other international exchange']},
    {id:'audited_years',label:'Years of audited financials available', type:'select', ph:'', req:true,
     options:['1 year','2 years','3 years','4+ years']},
    {id:'last_rev',    label:'Revenue — last financial year',   type:'text',    ph:'e.g. ₹45Cr',                                       req:true},
    {id:'net_worth',   label:'Net worth / paid-up capital',     type:'text',    ph:'e.g. ₹8Cr net worth',                              req:true},
    {id:'legal_status',label:'Any pending litigation or regulatory action?', type:'select', ph:'', req:true,
     options:['None','Minor — fully disclosed','Significant — details available on request']},
    {id:'auditor',     label:'Current auditor / CA firm',       type:'text',    ph:'e.g. Deloitte, BSR & Co., local CA firm name',      req:false},
    {id:'financials_url',label:'Audited financials (URL)',       type:'url',     ph:'Required — link to last 3 years\' audited statements', req:true},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','CA / advisor referral','Event or conference','Other']},
  ]},

  /* ── Form 7: Market test / Validation Sprint ── */
  test:{label:'Market test an idea before a big launch',fields:[
    {id:'full_name',   label:'Your name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@example.com',                                   req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'idea_validate',label:'What idea do you want to validate?', type:'textarea', ph:'Describe it clearly in 2–3 sentences — the problem, the proposed solution, and who it\'s for.', req:true},
    {id:'tested_already',label:'Have you tested this in any way already?', type:'select', ph:'', req:true,
     options:['No — this is purely conceptual','Yes — some informal conversations','Yes — ran a small test or survey','Yes — built a prototype or landing page']},
    {id:'prior_results',label:'What did the prior test show? (if applicable)', type:'textarea', ph:'Share key findings. Write "not applicable" if you haven\'t tested yet.', req:false},
    {id:'target_audience',label:'Who is your target audience?', type:'text',   ph:'e.g. Working women aged 30–45 in Tier 1 cities',     req:true},
    {id:'success_criteria',label:'What would success look like after the test?', type:'textarea', ph:'e.g. 50 sign-ups from cold outreach, 3 letters of intent from SMEs, 20% click-through on a landing page', req:true},
    {id:'test_budget', label:'Test budget (out of pocket)',     type:'text',    ph:'Optional — e.g. ₹2L. Write "unsure" if you don\'t know.', req:false},
    {id:'mockups_url', label:'Mockups or designs (URL)',        type:'url',     ph:'Optional — Figma, Google Drive, or Notion link',    req:false},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','College / campus event','Instagram or social media','Other']},
  ]},

  /* ── Form 8: Business valuation ── */
  value:{label:'Need to value my business',fields:[
    {id:'full_name',   label:'Your name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourbusiness.com',                              req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'biz_name',    label:'Business name',                   type:'text',    ph:'Your business name',                                req:true},
    {id:'biz_structure',label:'Business structure',             type:'select',  ph:'',                                                  req:true,
     options:['Private Limited (Pvt Ltd)','Limited Liability Partnership (LLP)','Partnership firm','Sole proprietorship','Public Limited','Other']},
    {id:'industry',    label:'Industry / sector',               type:'text',    ph:'e.g. Commercial printing & digital media',          req:true},
    {id:'years_op',    label:'Years in operation',              type:'text',    ph:'e.g. 8',                                            req:true},
    {id:'employees',   label:'Number of employees',             type:'select',  ph:'',                                                  req:true,
     options:['1–10','11–25','26–50','51–100','100+']},
    {id:'avg_rev',     label:'Average 3-year revenue',          type:'text',    ph:'e.g. ₹1.85Cr',                                    req:true},
    {id:'reason_val',  label:'Reason for valuation',            type:'select',  ph:'',                                                  req:true,
     options:['M&A / sale opportunity','Funding preparation','Partner buyout','ESOPs / internal restructure','Court or legal requirement','General awareness / annual practice']},
    {id:'financials_url',label:'Financial summary (URL)',        type:'url',     ph:'Required — we cannot value without financials. P&L, balance sheet preferred.', req:true},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','CA / advisor referral','Event or conference','Other']},
  ]},

  /* ── Form 9: Indian business going international ── */
  'intl-out':{label:'Domestic business seeking international partner',fields:[
    {id:'full_name',   label:'Your name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourcompany.in',                                req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+91 98765 43210',                                   req:false},
    {id:'company_name',label:'Company name',                    type:'text',    ph:'Full legal company name',                           req:true},
    {id:'product_cat', label:'Product or service category',     type:'text',    ph:'e.g. Premium Indian spices',                        req:true},
    {id:'domestic_footprint',label:'Current domestic footprint',type:'textarea', ph:'e.g. Pan-India, 18 states, listed on Amazon India and Flipkart, ₹4Cr annual revenue', req:true},
    {id:'export_revenue',label:'Current annual export revenue (if any)', type:'text', ph:'e.g. ₹40L to UAE. Write "none" if not exporting yet.', req:true},
    {id:'intl_certs',  label:'International certifications or compliance (if any)', type:'text', ph:'e.g. FDA approved, CE marked, FSSAI export licence, ISO 9001. Write "none" if not applicable.', req:true},
    {id:'target_markets',label:'Target international markets',  type:'text',    ph:'e.g. UAE, UK, USA East Coast',                      req:true},
    {id:'website',     label:'Company website',                 type:'url',     ph:'https://yourcompany.in',                            req:true},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','Industry event','Government / FIEO referral','Other']},
  ]},

  /* ── Form 10: International business entering India ── */
  'intl-in':{label:'International business seeking India partner',fields:[
    {id:'full_name',   label:'Your name',                       type:'text',    ph:'Your full name',                                    req:true},
    {id:'email',       label:'Email address',                   type:'email',   ph:'you@yourcompany.com',                               req:true},
    {id:'phone',       label:'Phone / WhatsApp',                type:'text',    ph:'+1 415 555 0192 (international numbers welcome)',   req:false},
    {id:'company_name',label:'Company name',                    type:'text',    ph:'Full legal company name',                           req:true},
    {id:'country',     label:'Country of origin',               type:'text',    ph:'e.g. United States of America',                     req:true},
    {id:'india_incorporated',label:'Are you incorporated in India?', type:'select', ph:'', req:true,
     options:['No — not yet','Yes — already have an Indian entity','In progress — incorporation underway']},
    {id:'india_segment',label:'India target market segment',    type:'textarea', ph:'e.g. Urban health-conscious consumers aged 25–45 in Tier 1 cities', req:true},
    {id:'collab_model',label:'Preferred collaboration model',   type:'select',  ph:'',                                                  req:true,
     options:['Reseller / distribution partnership','Joint venture (JV)','Technology transfer / licensing','Wholly owned subsidiary setup','Strategic investment in Indian company','Not sure — need guidance']},
    {id:'india_budget',label:'Budget allocated for India market entry', type:'select', ph:'', req:true,
     options:['Below $50K','$50K – $200K','$200K – $1M','Above $1M','Not yet determined']},
    {id:'website',     label:'Company website',                 type:'url',     ph:'https://yourcompany.com',                           req:true},
    {id:'contact_pref',label:'Preferred way to reach you',      type:'select',  ph:'',                                                  req:true,
     options:['Email','WhatsApp','Phone call (IST hours)','Phone call (my timezone)']},
    {id:'heard_from',  label:'How did you hear about Ideacubator?', type:'select', ph:'',                                              req:true,
     options:['Google search','LinkedIn','Friend or colleague','Embassy / trade body referral','Event or conference','Other']},
  ]}

};

let routerState={q1:null,q2:null};
function routerQ(q,val,btn){
  routerState['q'+q]=val;
  document.querySelectorAll('#q'+q+' .router-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  if(q===1){document.getElementById('q2-wrap').style.display='block';routerState.q2=null;document.querySelectorAll('#q2 .router-btn').forEach(b=>b.classList.remove('selected'));}
  if(routerState.q1&&routerState.q2){
    const r=document.getElementById('router-result');r.classList.add('show');
    const map={'no-no':'Studio Build — our team builds it with you. <a href="#m-studio" style="color:var(--accent);font-weight:500">See Model 01 ↓</a>','no-yes':'Validation Sprint — test the idea before your team builds. <a href="#m-sprint" style="color:var(--accent);font-weight:500">See Model 02 ↓</a>','yes-no':'Founder-Led Investment — fund your product, keep control. <a href="#m-founder" style="color:var(--accent);font-weight:500">See Model 03 ↓</a>','yes-yes':'Venture Partnership — scale together with strategic backing. <a href="#m-partner" style="color:var(--accent);font-weight:500">See Model 04 ↓</a>'};
    r.innerHTML='Recommended: <strong>'+map[routerState.q1+'-'+routerState.q2]+'</strong>';
  }
}

function loadForm(profile){
  const cfg=formConfigs[profile];
  const container=document.getElementById('form-fields');
  const consent=document.getElementById('form-consent');
  const btn=document.getElementById('btn-submit');
  const assurance=document.getElementById('form-assurance');
  document.getElementById('profile-select-err').classList.remove('show');
  document.getElementById('profile-select').classList.remove('err');
  if(!cfg){container.innerHTML='';container.classList.remove('show');consent.style.display='none';btn.style.display='none';assurance.style.display='none';return;}
  const user=Auth.current();
  let html='';
  cfg.fields.forEach(f=>{
    const isEmail=f.id==='email';
    const isName=f.id==='full_name';
    const prefill=isEmail&&user?user.email:isName&&user?user.name:'';
    const disabled=isEmail&&user?' disabled':'';
    html+=`<div><label class="form-label" for="${f.id}">${f.label}${f.req?'<span class="req">*</span>':'<span class="opt">(optional)</span>'}</label>`;
    if(f.type==='textarea'){
      html+=`<textarea class="form-textarea" id="${f.id}" placeholder="${f.ph}"${f.req?' required':''}>${prefill}</textarea>`;
    } else if(f.type==='select'){
      html+=`<select class="form-select" id="${f.id}"${f.req?' required':''}><option value="">Choose...</option>${(f.options||[]).map(o=>`<option value="${o}">${o}</option>`).join('')}</select>`;
    } else {
      html+=`<input class="form-input" type="${f.type}" id="${f.id}" placeholder="${f.ph}" value="${prefill}"${f.req?' required':''}${disabled}/>`;
    }
    html+=`<div class="form-field-err" id="err_${f.id}"></div></div>`;
  });
  container.innerHTML=html;
  container.classList.add('show');
  // Two-part consent (DPDP Act 2023 — granular consent)
  consent.style.display='block';
  consent.innerHTML=`
    <div class="form-consent" style="margin-bottom:8px">
      <input type="checkbox" id="consent_accuracy" onchange="validateConsent()">
      <label class="form-consent-label" for="consent_accuracy">I confirm that all information provided is accurate and complete. I agree to Ideacubator's <a href="#">Terms of Engagement</a> and <a href="#">Privacy Policy</a>.<span class="req"> *</span></label>
    </div>
    <div class="form-consent">
      <input type="checkbox" id="consent_contact" checked>
      <label class="form-consent-label" for="consent_contact">I consent to Ideacubator contacting me about this application and relevant opportunities. <span style="color:rgba(255,255,255,.28)">(Optional — unchecking limits contact to email only)</span></label>
    </div>
    <div class="form-field-err" id="consent-err">Please confirm the accuracy of your information before submitting.</div>`;
  btn.style.display='block';
  btn.disabled=true;
  assurance.style.display='block';
  document.getElementById('apply-global-err').innerHTML='';
}

function validateConsent(){
  const checked=document.getElementById('consent_accuracy')?.checked;
  document.getElementById('btn-submit').disabled=!checked;
  if(checked)document.getElementById('consent-err').classList.remove('show');
}

function validateField(field,cfg){
  const el=document.getElementById(field.id);
  const errEl=document.getElementById('err_'+field.id);
  if(!el||!errEl)return true;
  const val=el.value.trim();
  el.classList.remove('err');errEl.classList.remove('show');errEl.textContent='';
  const label=field.label.replace(/<[^>]+>/g,'').replace(/\*/g,'').trim();
  if(field.req&&!val){
    el.classList.add('err');
    errEl.textContent=field.type==='select'?`Please select ${label.toLowerCase().replace('?','')}.`:`${label} is required.`;
    errEl.classList.add('show');return false;
  }
  if(val&&field.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)){el.classList.add('err');errEl.textContent='Please enter a valid email address.';errEl.classList.add('show');return false;}
  if(val&&field.type==='url'&&!/^https?:\/\/.+/.test(val)&&field.req){el.classList.add('err');errEl.textContent='Please enter a valid URL starting with https://';errEl.classList.add('show');return false;}
  return true;
}

async function submitForm() {
    const profile = document.getElementById('profile-select').value;
    if (!profile) {
        document.getElementById('profile-select').classList.add('err');
        document.getElementById('profile-select-err').classList.add('show');
        return;
    }
    const cfg = formConfigs[profile];
    let valid = true;
    cfg.fields.forEach(f => { if (!validateField(f, cfg)) valid = false; });
    const consentAccuracy = document.getElementById('consent_accuracy');
    if (!consentAccuracy || !consentAccuracy.checked) {
        const errEl = document.getElementById('consent-err');
        if (errEl) errEl.classList.add('show');
        valid = false;
    }
    if (!valid) {
        document.getElementById('apply-global-err').innerHTML = '<div class="alert alert-err"><span class="alert-icon">⚠</span>Please fix the errors above before submitting.</div>';
        document.getElementById('apply-global-err').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    const btn = document.getElementById('btn-submit');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Submitting...';
    }

    const user = Auth.current();
    const data = {};
    cfg.fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) data[f.id] = el.value.trim();
    });
    data._consent_accuracy = true;
    data._consent_contact = document.getElementById('consent_contact')?.checked || false;

    const app = {
        userId: user.id,
        email: user.email,
        founderEmail: user.email, // Compatibility with existing dashboard
        founderName: user.name,   // Compatibility with existing dashboard
        profile,
        profileLabel: cfg.label,
        data,
        status: 'submitted',
        submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
        source: 'ideacubator.in'
    };

    try {
        await Apps.save(app);
        document.getElementById('apply-form-body').style.display = 'none';
        document.getElementById('form-success').classList.add('show');
        window.scrollTo({ top: document.getElementById('form-success').offsetTop - 100, behavior: 'smooth' });
    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Submit my application →';
        }
        document.getElementById('apply-global-err').innerHTML = `<div class="alert alert-err"><span class="alert-icon">⚠</span>Failed to submit. ${err.message}. Please try again.</div>`;
    }
}

// ── Firebase Auth Listener ──
auth.onAuthStateChanged(user => {
    console.log('Auth state changed:', user ? user.email : 'signed out');
    const mappedUser = Auth.current();
    updateNavAuth(mappedUser);
    
    // UI sections that depend on auth
    const authGate = document.getElementById('auth-gate');
    const applyForm = document.getElementById('apply-form');
    if (user) {
        if (authGate) authGate.style.display = 'none';
        if (applyForm) {
            applyForm.classList.add('visible');
            showApplyForm(mappedUser);
        }
    } else {
        if (authGate) authGate.style.display = 'block';
        if (applyForm) {
            applyForm.classList.remove('visible');
            const formBody = document.getElementById('apply-form-body');
            const formSuccess = document.getElementById('form-success');
            if (formBody) formBody.style.display = 'block';
            if (formSuccess) formSuccess.classList.remove('show');
        }
    }
});

function toggleDetail(el){
  const d=el.nextElementSibling;
  if (!d) return;
  d.classList.toggle('open');
  el.textContent=d.classList.contains('open')?'Less ↑':'More detail ↓';
}

// ── Journey ──
const jData=[
  {name:'Idea',entry:'student · first-timer',color:'#185fa5',bg:'#e6f1fb',tc:'#0c447c',title:'Idea stage',sub:"You have something in your head you can't stop thinking about. It doesn't need to be fully formed — just real enough to explain.",what:'We sit with you to shape the idea into something testable. We ask the hard questions early so you don\'t waste months building the wrong thing.',how:'Idea shaping sessions, market sizing, problem validation, competitor landscape',model:'Studio Build or Validation Sprint',personas:['College student','First-time founder'],cta:'I\'m at this stage'},
  {name:'Validate',entry:'professional · cautious',color:'#1d9e75',bg:'#d5f0e8',tc:'#085041',title:'Validate stage',sub:"You've got conviction — but not enough to bet everything on it yet. Smart move.",what:'8–12 week sprint: real customer conversations, market testing, and a clear go / no-go at the end.',how:'Customer discovery, market testing, feasibility assessment, measurable go/no-go criteria',model:'Validation Sprint',personas:['Corporate professional','Brand / innovation team'],cta:'I want to test first'},
  {name:'Build',entry:'any stage',color:'#534ab7',bg:'#eeedfe',tc:'#26215c',title:'Build stage',sub:"The idea is validated. Now it needs to become a real product. This is where most founders hit a wall — and where we come in.",what:"Our engineering team builds your product alongside you. You drive the vision. We drive the execution.",how:'Product team co-execution, AI-augmented development, sprint delivery, IP ownership defined upfront',model:'Studio Build',personas:['Non-technical founder','Professional with domain expertise'],cta:'I need a build partner'},
  {name:'Fund',entry:'entrepreneur · MVP-stage',color:'#ba7517',bg:'#faeeda',tc:'#633806',title:'Fund stage',sub:"You have a product — now you need capital to grow it.",what:"We invest directly or co-ordinate your seed round through our investor network.",how:'Direct investment, seed round coordination, investor network access, fundraising strategy',model:'Founder-Led Investment or Venture Partnership',personas:['MVP-stage founder','Entrepreneur'],cta:'I\'m ready to raise'},
  {name:'Scale',entry:'post-seed',color:'#d85a30',bg:'#fde8df',tc:'#712b13',title:'Scale stage',sub:"You've raised. Now the real pressure begins — hiring, GTM, new markets.",what:'We stay involved: structured 18-month roadmap, monthly reviews, network access for hiring.',how:'Scaling roadmap, hiring support, network access, board structure, monthly reviews',model:'Venture Partnership',personas:['Post-seed founder','Series A-stage company'],cta:'I need a scale partner'},
  {name:'Exit / IPO',entry:'business owner',color:'#a32d2d',bg:'#fde8df',tc:'#791f1f',title:'Exit / IPO stage',sub:"You've built something real. Now it's time to realise its value.",what:'We help business owners navigate M&A, valuations, international expansion, and IPO readiness.',how:'Business valuation, M&A advisory, IPO readiness, international partnerships',model:'Options 5, 6, 8, 9, 10',personas:['Business owner','Revenue-stage founder'],cta:'I\'m ready for exit or IPO'}
];
const connColors=['linear-gradient(90deg,#185fa5,#1d9e75)','linear-gradient(90deg,#1d9e75,#534ab7)','linear-gradient(90deg,#534ab7,#ba7517)','linear-gradient(90deg,#ba7517,#d85a30)','linear-gradient(90deg,#d85a30,#a32d2d)'];

function buildJourney(){
  const rail=document.getElementById('stages-rail');
  if (!rail) return;
  rail.innerHTML='';
  jData.forEach((s,i)=>{
    const item=document.createElement('div');item.className='stage-item'+(i===0?' active':'');
    item.innerHTML=`<div class="stage-num">0${i+1}</div><div class="stage-bubble" style="background:${s.bg};border-color:${s.color};color:${s.tc}">${i+1}</div><div class="stage-name">${s.name}</div><div class="stage-entry">${s.entry}</div>`;
    item.onclick=()=>{document.querySelectorAll('.stage-item').forEach((el,j)=>el.classList.toggle('active',j===i));renderDetail(i);};
    rail.appendChild(item);
    if(i<jData.length-1){const conn=document.createElement('div');conn.className='stage-connector';conn.style.background=connColors[i];rail.appendChild(conn);}
  });
  renderDetail(0);
}
const pBg={'College student':'#deeaf8','First-time founder':'#deeaf8','Corporate professional':'#d5f0e8','Brand / innovation team':'#d5f0e8','Non-technical founder':'#eeedfe','Professional with domain expertise':'#eeedfe','MVP-stage founder':'#faeeda','Entrepreneur':'#faeeda','Post-seed founder':'#fde8df','Series A-stage company':'#fde8df','Business owner':'#fde8df','Revenue-stage founder':'#fde8df'};
const pTx={'College student':'#0c447c','First-time founder':'#0c447c','Corporate professional':'#085041','Brand / innovation team':'#085041','Non-technical founder':'#26215c','Professional with domain expertise':'#26215c','MVP-stage founder':'#633806','Entrepreneur':'#633806','Post-seed founder':'#712b13','Series A-stage company':'#712b13','Business owner':'#791f1f','Revenue-stage founder':'#712b13'};
function renderDetail(i){
  const d=jData[i];
  const detail = document.getElementById('journey-detail');
  if (!detail) return;
  detail.style.borderColor=d.color;
  detail.innerHTML=`<div class="jd-top"><div class="jd-num">0${i+1}</div><div><div class="jd-title">${d.title}</div><div class="jd-sub">${d.sub}</div></div></div><div class="jd-grid"><div class="jd-card"><div class="jd-card-label">What we do here</div><div class="jd-card-val">${d.what}</div></div><div class="jd-card"><div class="jd-card-label">How we do it</div><div class="jd-card-val">${d.how}</div></div></div><div class="jd-card" style="margin-bottom:16px"><div class="jd-card-label">Engagement model</div><div class="jd-card-val" style="color:${d.color};font-weight:500">${d.model}</div></div><div class="jd-personas"><span style="font-size:10px;color:rgba(255,255,255,.3);margin-right:6px">Entry point for:</span>${d.personas.map(p=>`<span class="jd-persona" style="background:${pBg[p]||'#eee'};color:${pTx[p]||'#333'}">${p}</span>`).join('')}</div><div class="jd-cta"><div class="jd-cta-text">This sounds like where you are?</div><button class="jd-cta-btn" onclick="document.getElementById('apply').scrollIntoView({behavior:'smooth'})">${d.cta} →</button></div>`;
}

// ── Reveal on scroll ──
const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible');});},{threshold:.1});

// ── Testimonials carousel ──
function initTesti(){
  let idx=0;
  function getPerPage(){return window.innerWidth<=540?1:window.innerWidth<=800?2:3;}
  function getCards(){return document.querySelectorAll('.testi-card');}
  function totalSlides(){return Math.ceil(getCards().length/getPerPage());}

  function buildDots(){
    const dotsEl=document.getElementById('testi-dots');
    if(!dotsEl)return;
    const n=totalSlides();
    dotsEl.innerHTML='';
    for(let i=0;i<n;i++){
      const d=document.createElement('div');
      d.className='testi-dot'+(i===idx?' active':'');
      d.onclick=()=>goTo(i);
      dotsEl.appendChild(d);
    }
  }

  function goTo(i){
    const n=totalSlides();
    idx=((i%n)+n)%n;
    const perPage=getPerPage();
    const cardWidth=document.querySelector('.testi-card')?.offsetWidth||300;
    const gap=20;
    const offset=idx*perPage*(cardWidth+gap);
    const track=document.getElementById('testi-track');
    if(track)track.style.transform=`translateX(-${offset}px)`;
    document.querySelectorAll('.testi-dot').forEach((d,j)=>d.classList.toggle('active',j===idx));
  }

  window.slideTesti=function(dir){goTo(idx+dir);};

  // Auto-advance every 6s
  let timer=setInterval(()=>slideTesti(1),6000);
  document.getElementById('testi-track')?.addEventListener('mouseenter',()=>clearInterval(timer));
  document.getElementById('testi-track')?.addEventListener('mouseleave',()=>{timer=setInterval(()=>slideTesti(1),6000);});

  // Rebuild on resize
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{idx=0;buildDots();goTo(0);},200);});

  // Init after DOM ready
  setTimeout(()=>{buildDots();goTo(0);},100);
}

// ── Router ──
function routerQ(step, val, el) {
  const btns = el.parentElement.querySelectorAll('.router-btn');
  btns.forEach(b => b.classList.toggle('active', b === el));

  if (step === 1) {
    const q2 = document.getElementById('q2-wrap');
    const res = document.getElementById('router-result');
    if (val === 'no') {
      if (q2) q2.style.display = 'none';
      if (res) {
        res.style.display = 'block';
        res.innerHTML = '<div class="router-res-card"><h3>Recommended: Studio Build (Model 01)</h3><p>Since you have an idea but no product yet, our Studio team can co-build the MVP with you from scratch.</p><button onclick="document.getElementById(\'apply\').scrollIntoView({behavior:\'smooth\'})" class="btn-primary" style="margin-top:16px">Start your application <span class="arr">→</span></button></div>';
      }
    } else {
      if (q2) q2.style.display = 'block';
      if (res) res.style.display = 'none';
    }
  } else if (step === 2) {
    const res = document.getElementById('router-result');
    if (res) {
      res.style.display = 'block';
      if (val === 'no') {
        res.innerHTML = '<div class="router-res-card"><h3>Recommended: Studio Build or Validation Sprint</h3><p>You have a product but need a dedicated build team to reach the next stage. We can provide the engineering muscle.</p><button onclick="document.getElementById(\'apply\').scrollIntoView({behavior:\'smooth\'})" class="btn-primary" style="margin-top:16px">Start your application <span class="arr">→</span></button></div>';
      } else {
        res.innerHTML = '<div class="router-res-card"><h3>Recommended: Founder-Led Investment or Venture Partnership</h3><p>You have the product and the team — now you need capital and a scaling framework. We can partner as strategic investors.</p><button onclick="document.getElementById(\'apply\').scrollIntoView({behavior:\'smooth\'})" class="btn-primary" style="margin-top:16px">Start your application <span class="arr">→</span></button></div>';
      }
    }
  }
}

// ── Track Link ──
function handleTrackLink(e) {
  e.preventDefault();
  openAuthModal('dashboard');
}

// ── Consent Validation ──
function validateConsent() {
  const checkbox = document.getElementById('consent');
  const btn = document.getElementById('btn-submit');
  if (checkbox && btn) {
    btn.disabled = !checkbox.checked;
  }
}

// ── Investor Inquiry Handling ──
const Investors = {
    async save(data) {
        try {
            await db.collection('investorInquiries').add(data);
            console.log('✅ Investor inquiry saved');
            return true;
        } catch (err) {
            console.error('❌ Firestore error:', err);
            throw err;
        }
    }
};

function initInvestorForm() {
    const form = document.getElementById('investorForm');
    const success = document.getElementById('invest-success');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        if (!btn) return;
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Registering...';

        try {
            const data = {
                name: document.getElementById('inv-name').value.trim(),
                email: document.getElementById('inv-email').value.trim(),
                investmentRange: document.getElementById('inv-type').value,
                range: document.getElementById('inv-type').value,
                linkedin: document.getElementById('inv-linkedin')?.value.trim() || '',
                sectors: document.getElementById('inv-sectors').value.trim(),
                message: document.getElementById('inv-message').value.trim(),
                newsletter: document.getElementById('newsletter')?.checked || false,
                type: 'investor_interest',
                status: 'pending',
                submittedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await Investors.save(data);
            form.style.display = 'none';
            if (success) success.style.display = 'block';
        } catch (err) {
            alert('Failed to register interest. Please try again.');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    };
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
    // If we're in the admin terminal, skip the general site initialization.
    if (document.body.classList.contains('admin-terminal')) return;

    initNav();
    buildJourney();
    initTesti();
    initInvestorForm();
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    
    // Hash scroll handle
    if(window.location.hash) {
      setTimeout(() => {
        const id = window.location.hash.substring(1);
        document.getElementById(id)?.scrollIntoView({behavior:'smooth'});
      }, 500);
    }
});
