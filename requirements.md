Product Requirements Document (PRD)
Ideacubator.in – Venture Studio Platform
1. Product Vision

Ideacubator is a venture studio and deal-flow platform that supports startups from Idea → Validation → Build → Funding → Exit.

The website should function as:

Public front-door for founders and investors
Structured application intake system
Internal deal-flow management system
Founder & Investor portfolio dashboard
2. Design & UI Requirements (Very Important)
Theme
Item	Requirement
Theme	Light theme
UI Style	Clean, clutter-free
Fonts	Clear, readable sans-serif
Layout	Spacious, minimal, professional
CSS	Use claybrix.in CSS
Design Goal	Premium but simple
UX	Very clear navigation, no confusion
Performance	Lightweight, fast loading
3. Landing Page (Main Entry)

Landing page must clearly direct 3 types of visitors:

User	Action Button
Founder	Have an Idea
Investor	Want to Invest
Existing Applicant	Track My Application

These 3 buttons must be very prominent in Hero Section.

4. Page Structure (Important Layout Requirement)
Fixed Sections

These must always stay fixed:

Top Menu Bar
Hero Section
3 Action Buttons
Dynamic Section (Below Hero)

When user clicks menu → content below hero changes (SPA behavior).

5. Top Menu Structure

Menu items:

Menu	Page Content
Who We Are	About Ideacubator
Engagement Models	How we work with startups
Deal Flow Process	Application → Investment flow
Focus Areas	Sectors we invest/build
Our Studio	Incubator details, office, how studio works
Apply	Application page
Investor	Investor page
Login	Founder/Investor login

Each menu loads content below hero section.

6. Our Studio Page (Important for Branding)

This page should include:

Section	Content
What is Studio	Explanation of venture studio
How Studio Works	Step-by-step startup build
Studio Support	Tech, product, funding, hiring
Office	Startup office images
Build With Us	CTA to apply

This page builds credibility.

7. Founder Application System
7.1 Profile Tiles (Above Form)

Instead of dropdown → Use tiles/cards for easy selection:

Tile	Profile
Student	College Student
Working Professional	Employed Professional
MVP Ready	MVP Built
Revenue Startup	Revenue Generating
Sell My Business	Looking to Sell
IPO Preparation	IPO Help
Market Validation	Market Test
Company Valuation	Valuation
Go Global	Domestic → International
Enter India	International → Domestic

Click tile → Opens form.

This improves UX significantly.

7.2 Common Form Fields

All forms must collect:

Full Name
Email
Phone
LinkedIn
Startup / Idea Name
Idea Summary
Problem Statement
Solution
Funding Required
Equity Offered
Pitch Deck Upload
Additional Document Upload
Declaration Checkbox
Submit Button
7.3 File Upload Rules
Rule	Requirement
File types	PDF, JPG, PNG
Max size	500KB–700KB
If larger	Ask for Drive/Notion link
Storage	Cloud storage
DB	Store file URL only
8. Authentication

Use Firebase Authentication:

User	Login Method
Founder	Google Login
Investor	Google Login
Admin	Email login

After login:

Founder → Founder Dashboard
Investor → Investor Dashboard
Admin → Admin Dashboard
9. Founder Dashboard

Founder should be able to:

Feature	Description
View Application	See submitted application
Track Status	Pipeline status
Upload Files	Additional docs
Messages	Communication
Meeting Schedule	Meeting info
Investor Interest	Investor interest
Edit Application	Update info
10. Investor Dashboard

Investor should be able to:

Feature	Description
Investor Profile	Thesis, ticket size
Focus Areas	Sector interest
View Startups	Curated deals
Express Interest	Show interest
Meeting Request	Request meeting
Portfolio	Track invested companies
11. Admin Dashboard

Admin should be able to:

Feature	Description
View Applications	All submissions
Filter	By stage
Open Application	Full details
Change Status	Update pipeline
Add Notes	Internal notes
Upload Docs	Admin docs
Assign Reviewer	Assign admin
Schedule Meeting	Meeting
Investor Matching	Tag investors
Analytics	Dashboard
12. Application Status Pipeline
Stage
Submitted
Under Review
Meeting Scheduled
Due Diligence
Approved
Rejected
Invested
Incubation
Closed

Founder must see this status in dashboard.

13. Database – Firebase

All forms and data stored in Firebase.

Collections:

Collection	Purpose
users	Login users
applications	Startup applications
files	File links
status	Status history
investors	Investor data
investor_interest	Investor interest
meetings	Meetings
admin_notes	Notes
14. Email Notifications

Emails triggered when:

Event	Email
Application submitted	Confirmation
Status changed	Update
Meeting scheduled	Invite
Investor interested	Notify
Approved	Next steps
Rejected	Info
15. Deal Flow Process (Website Page)

Show this visually:

Apply → Review → Meeting → Due Diligence → 
Invest / Incubate / Reject → Build → Scale → Exit
16. Engagement Models Page

Explain clearly:

Model
Validation Sprint
Studio Build
Founder-Led Investment
Venture Partnership
M&A / Exit
IPO Preparation
17. Focus Areas Page
Sector
AI Platforms
B2B SaaS
HealthTech
FinTech
DeepTech
Automation
Global Expansion
18. System Architecture
Frontend → GitHub Pages
Backend → Firebase Functions
Database → Firebase Firestore
Auth → Firebase Auth
Storage → Cloud Storage / MEGA / R2
Email → SMTP / Resend
19. Development Phases
Phase 1 (Must Build Now)
Landing page
Menu pages
Founder application
Firebase DB
File upload
Admin dashboard
Status update
Email notification
Founder login + dashboard
Phase 2
Investor dashboard
Meeting scheduler
Messaging
Analytics
Phase 3
Investor-startup matching
Deal room
Cap table
Valuation tools
Portfolio tracking
20. Final Product Summary
Module	Purpose
Website	Public front
Application System	Intake
Admin Panel	Deal flow
Founder Dashboard	Track
Investor Dashboard	Invest
Studio Page	Build credibility
Final Positioning Statement (Use This Everywhere)

Ideacubator is a Venture Studio that builds, funds, and scales companies through a structured execution platform.

If You Build This Correctly

You are building:

Startup CRM
Deal flow software
Founder portal
Investor portal
Venture studio platform

This is a real business platform, not just a website.

rating of the idea (5star rating)