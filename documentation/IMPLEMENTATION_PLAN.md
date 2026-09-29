# Implementation Plan & Migration Roadmap
## Ideacubator Venture Studio Platform

**Version:** 1.0  
**Target Completion:** Production Ready  
**Execution Standard:** Zero-loss migration (retain 100% of current design, branding, content, and workflows).  

---

## 1. Migration Overview & Core Directives

### Non-Negotiable Directives:
1. **Design & Brand Preservation:** Maintain all luxury warm typography (`DM Sans` + `DM Serif Display`), terracotta accent (`#b85d19`), dark/light themes, and illuminated idea bulb logo with `"IDEAS INTO COMPANIES"` tagline.
2. **Content Integrity:** All static content (Studio Manifesto, Diligence Standards, 5-stage venture roadmap, Founder Guarantees, FAQs, SEO metadata) remains strictly intact.
3. **No Credit Card Requirement:** Architecture strictly leverages **Firebase Spark Free Tier** (Auth, Firestore, Cloud Storage 5 GB) and **Zoho Mail SMTP** on the user's existing domain.
4. **Single-Page Progressive Enhancement:** Enhance the existing clean web platform with modular JavaScript modules without disrupting running services.

---

## 2. Phased Implementation Roadmap

```
Phase 1: Firebase Storage & Secure Pitch Deck Vault
   │
   ▼
Phase 2: Real-Time Studio Chat Module (WebSocket onSnapshot)
   │
   ▼
Phase 3: In-App Calendar Scheduler & Video Call Room Generator
   │
   ▼
Phase 4: Zoho Mail Dispatcher & Calendar Invite (.ics) Engine
   │
   ▼
Phase 5: Studio Admin Console & Pipeline Command Center
   │
   ▼
Phase 6: End-to-End Verification & Production Readiness
```

---

### Phase 1: Firebase Storage & Secure Pitch Deck Vault
* **Goal:** Enable founders to directly upload PDFs, pitch decks, and financial models (up to 25 MB) directly to Firebase Cloud Storage with real-time progress feedback.
* **Deliverables:**
  * Update [`assets/js/firebase.js`](file:///c:/projects/ideacubator/assets/js/firebase.js) to initialize `firebase.storage()`.
  * Create `assets/js/storage-vault.js`: Handles drag-and-drop, client-side file validation (size, type), upload progress state (0% → 100%), and URL generation.
  * Integrate into [`pages/submit-idea.html`](file:///c:/projects/ideacubator/pages/submit-idea.html) and [`pages/dashboard.html`](file:///c:/projects/ideacubator/pages/dashboard.html).
  * Generate `storage.rules` for deployment.

### Phase 2: Real-Time Studio Chat Module
* **Goal:** Connect founders and studio partners in a bi-directional live chat drawer embedded directly inside the dashboard.
* **Deliverables:**
  * Create `assets/js/chat.js`: Handles Firestore real-time `onSnapshot` listeners, message rendering, optimistic updates, and unread counters.
  * Create accessible chat drawer component in [`pages/dashboard.html`](file:///c:/projects/ideacubator/pages/dashboard.html) and [`pages/admin.html`](file:///c:/projects/ideacubator/pages/admin.html).
  * Auto-tag messages with role (`founder` vs `studio`) and sender avatar.

### Phase 3: In-App Calendar Scheduler & Meeting Room Generator
* **Goal:** Allow founders to select discovery call slots and instantly generate Google Meet video call links.
* **Deliverables:**
  * Create `assets/js/scheduler.js`: Interactive calendar date & time slot picker.
  * Store booking in `/meetings/{id}` with auto-assigned Google Meet link.
  * Display upcoming meetings with direct "Join Video Call" button on the Founder Dashboard.

### Phase 4: Zoho Mail Notification Dispatcher & .ics Calendar Engine
* **Goal:** Automate email alerts from `team@ideacubator.in` using existing domain Zoho SMTP.
* **Deliverables:**
  * Create `assets/js/zoho-mail.js`: Formats professional HTML email templates for:
    1. Application submission receipt & 48-hr SLA notice.
    2. Studio partner new pitch alert.
    3. Meeting confirmation email with attached `.ics` iCalendar invite.
    4. Stage advancement notification.

### Phase 5: Studio Admin Console (`pages/admin.html`)
* **Goal:** Provide studio partners (Brijesh & team) with full administrative oversight.
* **Deliverables:**
  * Restrict access via Google Auth email check (`team@ideacubator.in`, `brijesh@ideacubator.in`).
  * Master Kanban pipeline: 1-click stage advancement (Phases 01 through 05).
  * Instant pitch deck viewer & download link.
  * In-line evaluation scorecard input (Market Opportunity, Feasibility, Conviction).
  * Admin chat inbox to reply directly to any founder.

### Phase 6: End-to-End Verification & Production Readiness
* **Goal:** Verify functionality, cross-browser compatibility, security, and deployment.
* **Deliverables:**
  * Test Google Auth login & logout flow.
  * Test pitch deck file upload to Firebase Storage and confirm URL in Firestore.
  * Test real-time chat between two sessions.
  * Test calendar booking and meeting generation.
  * Review Lighthouse SEO and Performance scores.
  * Generate `firebase.json` for 1-click Firebase Hosting deployment to `https://ideacubator.in`.
