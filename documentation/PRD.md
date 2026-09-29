# Product Requirements Document (PRD)
## Ideacubator Venture Studio Platform & Founder Portal

**Document Version:** 1.0  
**Status:** Approved for Implementation  
**Target Release:** Production v1.0  
**Author:** Ideacubator Product & Architecture Team  

---

## 1. Executive Summary & Vision

**Ideacubator** is a hands-on venture studio and technical co-builder that turns early-stage conviction into enduring companies. 

The goal of the **Ideacubator Platform** is to deliver a seamless, high-touch, and secure digital bridge between **Founders** and the **Studio Team**, supporting the full lifecycle from day-zero idea submission through validation, architectural prototyping, build execution, and investor syndication.

The platform eliminates friction by providing:
1. **1-Click Passwordless Authentication** via Google OAuth.
2. **Encrypted Document & Pitch Deck Vault** powered by Firebase Cloud Storage (5 GB free tier, zero card required).
3. **Real-Time Studio Chat** with sub-100ms synchronization between founders and studio partners.
4. **In-App Calendar Booking & Meeting Generation** with automated Google Meet links and `.ics` invites.
5. **Automated Transactional Emails** routed via existing domain-configured Zoho Business Mail (`team@ideacubator.in`).
6. **Master Studio Admin Command Center** for stage advancement, evaluation scoring, and diligence management.

---

## 2. Target Personas & Use Cases

### Persona 1: The Domain Founder (Applicant / Portfolio Founder)
* **Profile:** Working professional, technical innovator, or industry specialist with domain insights but needing a technical co-builder and execution studio.
* **Core Needs:**
  * Effortless submission with 100% intellectual property (IP) retention guarantees.
  * Real-time visibility into application review status across the 5 studio phases.
  * Direct chat channel with studio partners without having to track disconnected WhatsApp or email threads.
  * Easy scheduling of evaluation calls with automatic video links.
  * Simple upload and update of pitch decks (PDF), financial models, and research.

### Persona 2: Studio Partner & Lead Evaluator (Brijesh & Studio Team)
* **Profile:** Managing Partner and technical co-builders assessing venture viability, feasibility, and architecture.
* **Core Needs:**
  * Consolidated pipeline view of all incoming submissions categorized by stage and founder category.
  * Instant access to uploaded pitch decks and application data.
  * In-platform messaging with founders with unread indicators and timestamps.
  * Ability to advance venture stages (01 Diligence → 02 Validation → 03 Architecture → 04 Build → 05 Launch) with immediate real-time reflection on the founder’s dashboard.
  * Calendar availability management for pitch and diligence meetings.

### Persona 3: Qualified Angel & VC Co-Investors (Passive Stakeholder)
* **Profile:** Angels, family offices, and seed funds looking for pre-vetted, architecturally validated dealflow.
* **Core Needs:** Access to Phase 04/05 ventures with verified diligence summaries and operational metrics.

---

## 3. Product Architecture & Functional Requirements

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IDEACUBATOR PORTAL                              │
├───────────────────────────────────┬────────────────────────────────────┤
│ FOUNDER INTERFACE                 │ STUDIO ADMIN CONSOLE               │
├───────────────────────────────────┼────────────────────────────────────┤
│ • 1-Click Google Sign-In          │ • Master Venture Pipeline Kanban   │
│ • Application Submission Engine   │ • 1-Click Stage Advancement        │
│ • Stage Progress Tracker (01-05)  │ • Diligence & Evaluation Scoring   │
│ • Document Vault (PDFs/Decks)     │ • Unified Chat Inboxes             │
│ • Real-time Studio Chat Drawer    │ • Meeting Schedule Management      │
│ • Meeting Booking & Google Meet   │ • Pitch Deck & Asset Inspector     │
└───────────────────────────────────┴────────────────────────────────────┘
```

### Module 1: Authentication & Identity Management
* **Requirement 1.1:** Authentication shall strictly utilize **Firebase Authentication with Google OAuth** (`signInWithPopup` / `signInWithRedirect`).
* **Requirement 1.2:** Email/password creation and manual password inputs are **permanently disabled**.
* **Requirement 1.3:** Upon first login, user profile attributes (`uid`, `email`, `displayName`, `photoURL`, `createdAt`) shall be synced to `/users/{uid}` in Cloud Firestore.
* **Requirement 1.4:** Role authorization:
  * Users with email `brijesh@ideacubator.in` or `team@ideacubator.in` are automatically assigned the `ADMIN` role.
  * All other authenticated Google users are assigned the `FOUNDER` role.

### Module 2: Venture Submission & Stage Pipeline
* **Requirement 2.1:** Form submissions capture:
  * Founder Profile (Name, Email, Phone, Background: Student / Working Professional / Existing Business).
  * Venture Profile (Concept Name, Industry, One-Line Vision, Problem Statement, Target Audience).
  * Stage & Traction (Current stage, traction metrics, competitors, primary bottleneck).
  * Support Needed (Technical Co-builder, Architecture, MVP, GTM, Capital).
* **Requirement 2.2:** Each application is initialized with state:
  * `stage: 1` (*Phase 01: Scope, Feasibility & Diligence*)
  * `status: "under_review"`
  * `submittedAt: serverTimestamp()`
* **Requirement 2.3:** The 5-stage venture roadmap reflects:
  1. *Phase 01: Scope, Feasibility & Diligence*
  2. *Phase 02: Business Model Validation & GTM Hypothesis*
  3. *Phase 03: Architecture, UI/UX & Technical Prototype*
  4. *Phase 04: Production MVP Build & Alpha Testing*
  5. *Phase 05: Founder Launch, GTM & Venture Syndication*

### Module 3: Document Vault & Pitch Deck Storage
* **Requirement 3.1:** Uploads shall be directly transmitted to **Firebase Cloud Storage** (Spark Free Tier) under path:
  `/pitch_decks/{userId}/{timestamp}_{filename}`
* **Requirement 3.2:** Supported formats: PDF, DOCX, PPTX, XLSX, PNG, JPG (Max file size: 25 MB).
* **Requirement 3.3:** Progress bar UI indicates real-time upload progress (0% to 100%).
* **Requirement 3.4:** Upon successful upload, document metadata (`fileName`, `fileSize`, `downloadUrl`, `uploadedAt`) is recorded in the Firestore application document.
* **Requirement 3.5:** Fallback option: External pitch links (Google Drive, DocSend, Notion, Pitch.com) can be provided directly.

### Module 4: Real-Time Studio Chat
* **Requirement 4.1:** Bi-directional messaging thread between founder and studio partners stored in Firestore under:
  `/applications/{appId}/messages/{messageId}`
* **Requirement 4.2:** Real-time synchronization using Firestore `onSnapshot` listeners with zero page reloads.
* **Requirement 4.3:** Message payload includes:
  * `senderId`: Google UID of author
  * `senderName`: Display name
  * `senderRole`: `"founder"` | `"studio"`
  * `senderAvatar`: Google profile picture URL
  * `content`: Text message string
  * `timestamp`: Firestore server timestamp
  * `read`: Boolean flag
* **Requirement 4.4:** Responsive UI drawer available directly on the Founder Dashboard and Admin Console.

### Module 5: Meeting Scheduler & Video Call Generation
* **Requirement 5.1:** Founders can select from studio availability slots (30-minute discovery / diligence review).
* **Requirement 5.2:** Meeting record stored in `/meetings/{meetingId}` containing:
  * `founderId`, `founderEmail`, `founderName`
  * `meetingDate`, `meetingTime`, `timezone`
  * `topic`: e.g. "Phase 01 Diligence Discovery Call"
  * `meetingUrl`: Generated Google Meet link or studio room URL
  * `status`: `"confirmed"` | `"rescheduled"` | `"completed"`
* **Requirement 5.3:** The system generates an `.ics` standard iCalendar invitation dispatched via Zoho Mail to both the founder and studio partner.

### Module 6: Transactional Notifications (Zoho Business Mail)
* **Requirement 6.1:** Connects to Zoho Mail SMTP:
  * **Host:** `smtp.zoho.in` (Port 465 SSL)
  * **Sender:** `team@ideacubator.in`
* **Requirement 6.2:** Automated triggers:
  1. *Application Receipt:* Instant confirmation sent to founder with reference ID and 48-hour SLA notice.
  2. *Studio Alert:* Instant notification to `team@ideacubator.in` when a new venture is submitted.
  3. *Stage Progression Alert:* Sent to founder when studio partners advance their phase.
  4. *Meeting Confirmation:* Dispatches date, time, Google Meet URL, and `.ics` calendar attachment.

---

## 4. Non-Functional Requirements

| Metric | Target | Verification Method |
| :--- | :--- | :--- |
| **Page Speed & Performance** | > 90 on Google Lighthouse | Chrome DevTools Audit |
| **SEO Rating** | 100/100 across public pages | Rich Snippets & Schema Validator |
| **Chat Latency** | < 150 ms end-to-end | WebSocket Firestore Snapshot |
| **Security & Privacy** | Zero data cross-talk between tenants | Firestore Security Rules Test Suite |
| **Monthly Operating Cost** | **$0.00 / month** | Firebase Spark + Zoho Domain quota |
| **Credit Card Required** | **None** | Free tier compliance |

---

## 5. Design System Integrity

The visual design must strictly preserve:
* **Typography:** `DM Sans` (body, buttons, inputs) and `DM Serif Display` (editorial headings).
* **Color Palette:**
  * Background Paper: `#fbf8f3` (Light) / `#111110` (Dark)
  * Primary Accent: Terracotta Brown `#b85d19` / `#c05621`
  * Card Surfaces: `#ffffff` (Light) / `#1a1918` (Dark)
  * Dividers & Borders: `#e8e2d8` (Light) / `#2b2825` (Dark)
* **Brand Mark:** Terracotta square tile with illuminated idea bulb SVG and uppercase tagline `"IDEAS INTO COMPANIES"`.
