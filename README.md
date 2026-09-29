# Ideacubator Go-Live Platform

Ideacubator is a production-ready, founder-first venture platform designed to take ideas from concept through exploration, validation, engineering, launch, and growth.

Built with a lightweight, high-performance architecture: **Vanilla HTML5, CSS3, ES6 JavaScript, and Firebase**, optimized for seamless deployment to **GitHub Pages** and **Firebase Hosting**.

---

## 1. Architecture & Design System

- **Visual Baseline**: Light cream (`#fbf8f3`) and white surfaces, rich chocolate brown primary accents (`#8f3f17`), and subtle warm neutrals. Dark mode toggle supported via CSS variables.
- **Typography**: Google Fonts `DM Sans` (for clean, readable UI) and `DM Serif Display` (for editorial headings).
- **Core Design System**: Unified in [assets/css/global.css](file:///c:/projects/ideacubator/assets/css/global.css) and [portal.css](file:///c:/projects/ideacubator/portal.css).
- **Zero Heavy Frameworks**: No React/Next/Vue overhead; lightning-fast page loads, full accessibility, and static host compatibility.

---

## 2. Directory Structure

```
/
├── index.html                     # Primary public homepage (What is Ideacubator, Journey, Services)
├── about.html                     # About Ideacubator & Founder Brijesh (20+ yrs experience, fintech/health/AI)
├── submit-idea.html               # 4-Step authenticated founder application + AI Review Assist
├── dashboard.html                 # Private founder workspace (Overview, Idea, Messages, Meetings, Tasks, Docs)
├── admin.html                     # Deal flow operations console (Review, status transitions, private notes)
├── invest.html                    # Institutional & angel investor inquiry registration
├── contact.html                   # Studio inquiries & Bangalore office contact
├── terms.html                     # Terms of Engagement (governed by the laws of India)
├── privacy.html                   # Privacy Policy (compliant with DPDP Act, 2023)
├── confidentiality.html           # Confidentiality & IP Notice
├── application-disclaimer.html    # Application intake and AI review disclaimer
├── portal.css                     # Master portal styling
├── portal.js                      # Core portal utilities, toast system, payload builders
│
├── assets/
│   ├── css/
│   │   └── global.css             # Canonical design system tokens, typography & components
│   ├── js/
│   │   ├── config.js              # Public browser-safe Firebase & app configuration
│   │   ├── firebase.js            # Centralized Firebase SDK singleton (v8 compat)
│   │   ├── auth.js                # Google Sign-In, session persistence, and role verifier
│   │   ├── application.js         # Multi-step validation, dynamic userTypes, Storage & Firestore writes
│   │   ├── dashboard.js           # Realtime streams for applications, messages, meetings, tasks
│   │   ├── admin.js               # Admin pipeline manager, status history logger, internal notes
│   │   ├── ui.js                  # Modals, toasts, and interaction controllers
│   │   └── main.js                # Homepage interactions (video modal, responsive drawer)
│   └── img/
│       ├── logo.png               # Brand logo assets
│       └── ...
│
├── functions/
│   ├── package.json               # Cloud Functions dependencies (@google/generative-ai, firebase-admin)
│   └── index.js                   # Callable reviewIdeaWithAI (Gemini), setAdminClaim, audit trigger
│
├── firestore.rules                # Strict UID-based Firestore Security Rules
├── storage.rules                  # Document MIME validation, size <= 10MB, and UID-scoped Storage Rules
├── firestore.indexes.json         # Composite indexes for queries
├── firebase.json                  # Firebase Hosting, Functions, and Rules deployment spec
├── .env.example                   # Documentation of public client vs private server variables
├── .gitignore                     # Git ignore rules protecting keys and build outputs
└── README.md                      # Operational and deployment guide
```

---

## 3. Local Development

You can run the platform locally using any static web server:

### Option A: Using Node's `serve` or `http-server`
```bash
npx serve .
# or
npx http-server -p 8080 -c-1
```
Open [http://localhost:8080](http://localhost:8080) in your browser.

### Option B: Using Python's built-in HTTP Server
```bash
python -m http.server 8080
```

### Option C: Using Firebase Local Emulator Suite
```bash
firebase emulators:start
```

---

## 4. Environment Variables & Security Strategy

### Public vs. Private Credentials
- **Browser-Safe Configuration**:
  The Firebase client configuration in [assets/js/config.js](file:///c:/projects/ideacubator/assets/js/config.js) (`apiKey`, `authDomain`, `projectId`, `storageBucket`, etc.) is **public by design** in Firebase architecture. Security is enforced by **Firebase Security Rules**, NOT by hiding client keys.
  
- **Private Server Secrets (NEVER in browser JS or GitHub Pages)**:
  - `GEMINI_API_KEY`: Kept exclusively inside Google Cloud / Firebase Cloud Functions.
  - Set via the Firebase CLI Secret Manager:
    ```bash
    firebase functions:secrets:set GEMINI_API_KEY
    ```

### Dedicated Inbound Email Routing
- **Founder Idea Submissions**: Routed and recorded for `submitidea@ideacubator.in`.
- **Investor & Mandate Inquiries**: Routed and recorded for `invest@ideacubator.in`.
- **General Support & Legal**: `team@ideacubator.in`.

---

## 5. AI Review Implementation

- **Location**: Cloud Function `reviewIdeaWithAI` in [functions/index.js](file:///c:/projects/ideacubator/functions/index.js).
- **Model**: `gemini-1.5-flash` with structured JSON output schema.
- **Workflow**:
  1. Founder enters idea in `submit-idea.html` (Step 4).
  2. Clicks `✦ Review my idea with AI`.
  3. Client makes an authenticated callable request to `reviewIdeaWithAI`.
  4. Backend verifies `context.auth` (prevents anonymous quota exhaustion).
  5. Gemini analyzes the proposal and returns:
     - `clarityScore` (1–10)
     - `oneLineSummary`
     - `problemAssessment`
     - `customerAssessment`
     - `promisingPoints`
     - `openQuestions`
     - `nextExperiment`
     - `recommendedFounderActions`
  6. Results render in an editable card allowing the founder to refine their answers prior to final submission.
  7. Client includes an offline-resilient fallback so submission is never blocked if the external AI service is unreachable.

---

## 6. Access Control & Security Model

### Founder Isolation
- Every application is stamped with `applicantUid == request.auth.uid`.
- Firestore Rules enforce that a founder can ONLY query and read applications where `applicantUid == request.auth.uid`.
- Storage Rules ensure files under `applications/{applicationId}/documents/*` can only be read by the owner or authorized admins.

### Internal Confidential Notes
- Internal reviewer notes and due diligence remarks are stored in the separate `admin_notes` collection.
- Security rules strictly allow `read, write: if isAdmin();`. Founders have **zero read permission** on this collection.

### Admin Privileges
- Admin verification uses trusted Firebase Custom Claims (`token.admin == true`), verified server-side.
- Fallback check supports `users/{uid}.role == 'admin'` and the designated administrative email (`admin@ideacubator.in`).
- Non-admins are locked out of `admin.html` and cannot update pipeline statuses or view other founders' data.

---

## 7. Deployment Guide

### Deploying to GitHub Pages
1. Push the repository to your GitHub repository `main` branch.
2. In GitHub, go to **Settings &rarr; Pages**.
3. Under **Branch**, select `main` and root `/`.
4. Click **Save**. The static site is live within 60 seconds.

### Deploying to Firebase Hosting & Functions
1. Log in to Firebase:
   ```bash
   firebase login
   ```
2. Select or link the project:
   ```bash
   firebase use rational-world-330006
   ```
3. Set your Gemini API key in Secret Manager:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
4. Deploy Rules, Storage, Functions, and Hosting:
   ```bash
   firebase deploy
   ```

---

## 8. Go-Live Verification Checklist

- [x] **Authentication**: Google Sign-In with popup, session persistence, automatic profile pre-fill.
- [x] **Founder Intake**: 4-step progressive form with dynamic fields for 10 founder situations.
- [x] **File Storage**: Drag-and-drop document upload with MIME validation and 10MB limits.
- [x] **AI Idea Review**: Structured Gemini analysis with strict disclaimer and resilient fallback.
- [x] **Founder Workspace**: Realtime application status, team messaging feed, meeting scheduler, and task toggles.
- [x] **Operations Console**: Deal flow table with search/filters, status history updater, and private internal notes.
- [x] **Legal Protection**: Comprehensive Terms of Engagement, Privacy Policy, Confidentiality Notice, and Disclaimers.
- [x] **Security Hardening**: Strict Firestore and Storage rules scoped by `applicantUid`. Zero secret exposure in frontend.
