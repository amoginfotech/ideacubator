'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type SectionId = 'idea' | 'pitch' | 'plan' | 'prototype' | 'launch' | 'grow' | 'tools' | 'faq';

interface StageMeta {
  id: SectionId;
  no: string;
  icon: string;
  title: string;
  sub: string;
}

const STAGES: StageMeta[] = [
  { id: 'idea', no: '01', icon: '💡', title: 'Idea', sub: 'Discover & Validate' },
  { id: 'pitch', no: '02', icon: '🎯', title: 'Pitch', sub: '5-Box Story' },
  { id: 'plan', no: '03', icon: '📄', title: 'Plan', sub: 'Architecture & Capital' },
  { id: 'prototype', no: '04', icon: '📦', title: 'Prototype', sub: 'Lean MVP' },
  { id: 'launch', no: '05', icon: '🚀', title: 'Launch', sub: 'Go-to-Market' },
  { id: 'grow', no: '06', icon: '📈', title: 'Grow', sub: 'Scale & Optimize' },
];

const UTILITY_SECTIONS: StageMeta[] = [
  { id: 'tools', no: '07', icon: '🛠️', title: 'Founder Tools', sub: 'Frameworks & Review' },
  { id: 'faq', no: '08', icon: '❓', title: 'Diligence FAQs', sub: 'Direct Founder Answers' },
];

export default function KnowledgeHubClient() {
  const [activeSection, setActiveSection] = useState<SectionId>('idea');

  // Sync with URL hash on mount & hashchange
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '') as SectionId;
      if (['idea', 'pitch', 'plan', 'prototype', 'launch', 'grow', 'tools', 'faq'].includes(hash)) {
        setActiveSection(hash);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const sectionRef = React.useRef<HTMLDivElement>(null);

  const selectSection = (id: SectionId) => {
    setActiveSection(id);
    window.history.replaceState(null, '', `#${id}`);
    if (sectionRef.current) {
      const yOffset = -90;
      const y = sectionRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Find next and previous stages for smooth bottom step-through navigation
  const allNav = [...STAGES, ...UTILITY_SECTIONS];
  const currentIndex = allNav.findIndex((s) => s.id === activeSection);
  const prevStage = currentIndex > 0 ? allNav[currentIndex - 1] : null;
  const nextStage = currentIndex < allNav.length - 1 ? allNav[currentIndex + 1] : null;

  return (
    <div className="container kh-hub-container">
      {/* ==========================================================================
          2-COLUMN LAYOUT: STICKY LEFT NAV AT TOP + RIGHT MAIN COLUMN
          ========================================================================== */}
      <div className="kh-layout-grid">
        {/* LEFT FIXED/STICKY NAVIGATION MENU (STARTS AT TOP OF PAGE) */}
        <aside className="kh-sidebar">
          <div className="kh-sidebar-inner">
            <div className="kh-sidebar-header">
              <div className="eyebrow" style={{ color: 'var(--brown)', margin: 0 }}>
                LEARNING PATH
              </div>
              <h3 style={{ fontSize: '15px', margin: '4px 0 0', fontWeight: 800 }}>
                Venture Milestones
              </h3>
            </div>

            <nav className="kh-nav-list" aria-label="Journey stages">
              {STAGES.map((stage) => {
                const isActive = activeSection === stage.id;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => selectSection(stage.id)}
                    className={`kh-nav-btn ${isActive ? 'active' : ''}`}
                  >
                    <span className="kh-nav-icon">{stage.icon}</span>
                    <span className="kh-nav-text">
                      <strong className="kh-nav-title">
                        <span className="kh-nav-no">{stage.no}.</span> {stage.title}
                      </strong>
                      <span className="kh-nav-sub">{stage.sub}</span>
                    </span>
                    {isActive && <span className="kh-nav-indicator">●</span>}
                  </button>
                );
              })}

              <div className="kh-nav-divider" />

              <div className="kh-nav-subhead">ADDITIONAL RESOURCES</div>

              {UTILITY_SECTIONS.map((section) => {
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => selectSection(section.id)}
                    className={`kh-nav-btn ${isActive ? 'active' : ''}`}
                  >
                    <span className="kh-nav-icon">{section.icon}</span>
                    <span className="kh-nav-text">
                      <strong className="kh-nav-title">{section.title}</strong>
                      <span className="kh-nav-sub">{section.sub}</span>
                    </span>
                    {isActive && <span className="kh-nav-indicator">●</span>}
                  </button>
                );
              })}
            </nav>

            <div className="kh-sidebar-cta">
              <p>Ready to build your venture?</p>
              <Link href="/submit-idea" className="primary" style={{ width: '100%', justifyContent: 'center', padding: '10px' }}>
                Submit an Idea →
              </Link>
            </div>
          </div>
        </aside>

        {/* RIGHT SIDE MAIN COLUMN (STARTS WITH HERO IMAGE, ROLLS UP TO SECTIONS) */}
        <main className="kh-main-content">
          {/* HEADER STRIP ON TOP OF IMAGE: REDUCED FONT IN ONE SINGLE LINE */}
          <div className="kh-hero-top-line">
            <strong className="kh-hero-line-title">From Idea to Scaled Venture</strong>
            <span className="kh-hero-line-sep">—</span>
            <span className="kh-hero-line-sub">
              Select any milestone on the left navigation to explore practical frameworks, checklists, and videos.
            </span>
          </div>

          {/* HERO IMAGE BANNER (CLEAN, NO MENU ON IMAGE) */}
          <div className="kh-hero-visual-card">
            <div className="kh-hero-img-wrap">
              <Image
                src="/assets/knowledge-hero.jpg"
                alt="Ideacubator Founder Journey"
                width={1400}
                height={680}
                priority
                className="kh-hero-img"
              />

              <div className="kh-hero-overlay-clean">
                <div className="kh-hero-bottom-bar">
                  <span className="kh-hero-prompt">
                    Have an idea ready to build? Partner with Ideacubator’s engineering studio.
                  </span>
                  <Link href="/submit-idea" className="kh-hero-cta-btn">
                    Submit an Idea →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* STATS / VALUE BAND */}
          <section className="kh-band">
            <div className="kh-band-grid">
              <div className="kh-band-item">
                <strong>6 Journey Stages</strong>
                <span>Idea, Pitch, Plan, Prototype, Launch, Grow</span>
              </div>
              <div className="kh-band-item">
                <strong>Action Oriented</strong>
                <span>Every stage delivers a concrete founder output</span>
              </div>
              <div className="kh-band-item">
                <strong>Co-Building Support</strong>
                <span>Ideacubator engineers software with you</span>
              </div>
              <div className="kh-band-item">
                <strong>100% Founder IP</strong>
                <span>Zero equity claims during diligence review</span>
              </div>
            </div>
          </section>

          {/* ACTIVE SECTION TARGET ANCHOR */}
          <div ref={sectionRef} style={{ scrollMarginTop: '96px' }} />
          {/* ====================================================================
              STAGE 1: IDEA — DISCOVER & VALIDATE
              ==================================================================== */}
          {activeSection === 'idea' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Stage 01 · Idea</div>
                <h2>Discover &amp; Validate</h2>
                <p>
                  Figure out the core problem, identify the target user wedge, and test fundamental assumptions before
                  writing a single line of software. Great ventures fail when founders build things nobody urgently needs.
                </p>
              </div>

              <div className="kh-visual-grid">
                <div className="kh-visual-side">
                  <div className="eyebrow">Customer Discovery Framework</div>
                  <h3>5 Questions that prove genuine user demand</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '18px' }}>
                    Conduct user interviews like an investigator, not a salesperson. Look for current workarounds rather
                    than polite compliments.
                  </p>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">1</div>
                    <div>
                      <strong>What is the acute problem?</strong>
                      <span>What is currently slow, expensive, fragmented, or fundamentally broken in the user’s workflow?</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">2</div>
                    <div>
                      <strong>Who suffers from it most acutely?</strong>
                      <span>Identify the specific persona losing time or money daily, who has the budget to pay for a fix.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">3</div>
                    <div>
                      <strong>How are they hacking a workaround today?</strong>
                      <span>Messy Excel sheets, manual phone calls, or cobbled tools prove that real willingness-to-pay exists.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">4</div>
                    <div>
                      <strong>Why would they switch to your solution?</strong>
                      <span>Is your approach 10x faster, dramatically cheaper, or eliminating severe frustration?</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">5</div>
                    <div>
                      <strong>What is the smallest test you can run this week?</strong>
                      <span>Create a concierge pilot, mock landing page, or pre-order test to get raw customer proof.</span>
                    </div>
                  </div>
                </div>

                <div className="kh-visual-side" style={{ background: 'var(--paper)' }}>
                  <div className="eyebrow">Validation Checklist</div>
                  <h3>Signals of genuine venture potential</h3>

                  <div className="kh-check-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="kh-check">
                      <strong>Pain is acute, not hypothetical</strong>
                      <span>Users are actively hunting for a workaround and losing revenue or hours daily.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Clear buyer with budget authority</strong>
                      <span>You know the exact job title or persona who holds the corporate or personal card.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Organic distribution wedge</strong>
                      <span>You know where the first 50 early adopters hang out and how to reach them directly.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Fast feedback loops</strong>
                      <span>You can prototype a lightweight workflow in 2–3 weeks to measure real user retention.</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <Link href="/submit-idea" className="primary" style={{ padding: '10px 18px', borderRadius: '999px', fontSize: '13px' }}>
                      Test Your Idea with AI Review →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              STAGE 2: PITCH — THE HIGH-CONVICTION STORY
              ==================================================================== */}
          {activeSection === 'pitch' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Stage 02 · Pitch</div>
                <h2>The High-Conviction Story</h2>
                <p>
                  Do not start with 40-slide corporate decks. Start with a crystal-clear narrative. Your story should make any
                  partner, investor, or early customer immediately grasp the problem, market wedge, and execution path.
                </p>
              </div>

              <div className="kh-pitch-grid">
                <article className="kh-pitch-card accent">
                  <div className="eyebrow" style={{ color: '#ffd6bf' }}>The 5-Box Pitch Framework</div>
                  <h3>Explain your idea in five boxes.</h3>
                  <p>Before designing slides, answer these five questions in plain conversational language.</p>

                  <div className="kh-pitch-steps">
                    <div className="kh-pitch-step">
                      <b>01</b>
                      <div>
                        <strong>Problem</strong>
                        <span>What concrete daily friction or financial leakage exists?</span>
                      </div>
                    </div>

                    <div className="kh-pitch-step">
                      <b>02</b>
                      <div>
                        <strong>Customer</strong>
                        <span>Who experiences it and holds the decision power to buy?</span>
                      </div>
                    </div>

                    <div className="kh-pitch-step">
                      <b>03</b>
                      <div>
                        <strong>Solution</strong>
                        <span>What are you building and how does it solve it effortlessly?</span>
                      </div>
                    </div>

                    <div className="kh-pitch-step">
                      <b>04</b>
                      <div>
                        <strong>Evidence / Wedge</strong>
                        <span>What initial customer conversations or pilots prove this is real?</span>
                      </div>
                    </div>

                    <div className="kh-pitch-step">
                      <b>05</b>
                      <div>
                        <strong>Next 90-Day Milestone</strong>
                        <span>What concrete technical or commercial milestone do you hit next?</span>
                      </div>
                    </div>
                  </div>
                </article>

                <article className="kh-pitch-card">
                  <div className="eyebrow">Pitch Checklist</div>
                  <h3>Before you present or submit</h3>

                  <div className="kh-check-grid">
                    <div className="kh-check">
                      <strong>Can a stranger repeat it?</strong>
                      <span>If they can’t summarize it in one sentence, simplify your narrative further.</span>
                    </div>

                    <div className="kh-check">
                      <strong>Is the customer specific?</strong>
                      <span>“Everyone in India” is not an actionable early wedge. Target an acute beachhead.</span>
                    </div>

                    <div className="kh-check">
                      <strong>Context before features?</strong>
                      <span>Explain the real pain and cost before listing fancy technical features.</span>
                    </div>

                    <div className="kh-check">
                      <strong>Separate facts from assumptions?</strong>
                      <span>Be transparent about what you’ve verified vs what you’re currently testing.</span>
                    </div>

                    <div className="kh-check">
                      <strong>Is your ask clear?</strong>
                      <span>State whether you need technical co-builders, capital, or pilot users.</span>
                    </div>

                    <div className="kh-check">
                      <strong>Can you say it in 60 seconds?</strong>
                      <span>Brevity and punchiness beat long-winded monologues every time.</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}

          {/* ====================================================================
              STAGE 3: PLAN — STARTUP ARCHITECTURE, MILESTONES & CAPITAL
              ==================================================================== */}
          {activeSection === 'plan' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Stage 03 · Plan</div>
                <h2>Startup Blueprint: Architecture, Milestones &amp; Funding</h2>
                <p>
                  How to turn a raw idea into a viable commercial startup. Define your operational milestones, financial model,
                  runway requirements, and how Ideacubator co-engineers the technology with you.
                </p>
              </div>

              <div className="kh-visual-grid">
                <div className="kh-visual-side">
                  <div className="eyebrow">Execution Roadmap</div>
                  <h3>The 90-Day Milestone Sprint</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '13.5px', marginBottom: '18px' }}>
                    Stop planning for 5 years out. Focus on the next 90 days with measurable deliverables that de-risk the venture.
                  </p>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">M1</div>
                    <div>
                      <strong>Days 1–30: Validation &amp; Architecture</strong>
                      <span>Complete 25 customer discovery interviews, define technical architecture, and lock MVP scope.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">M2</div>
                    <div>
                      <strong>Days 31–60: Build Core MVP</strong>
                      <span>Co-build the functional core product with Ideacubator engineers. Test with 5 close design partners.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">M3</div>
                    <div>
                      <strong>Days 61–90: First 10 Paying Pilots</strong>
                      <span>Onboard initial cohort, instrument telemetry, confirm willingness-to-pay, and prepare seed diligence.</span>
                    </div>
                  </div>
                </div>

                <div className="kh-visual-side" style={{ background: 'var(--paper)' }}>
                  <div className="eyebrow">Financial &amp; Funding Model</div>
                  <h3>Funding, Runway &amp; Unit Economics</h3>

                  <div className="kh-check-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="kh-check">
                      <strong>Bootstrap vs External Capital</strong>
                      <span>Understand when to preserve equity vs when growth capital accelerates market capture.</span>
                    </div>
                    <div className="kh-check">
                      <strong>18-Month Runway Budgeting</strong>
                      <span>Calculate burn rate: engineering costs, server infrastructure, and founder living stipends.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Unit Economics Modeling</strong>
                      <span>Estimate Customer Acquisition Cost (CAC), Lifetime Value (LTV), and Gross Margin targets.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Ideacubator Studio Co-Building</strong>
                      <span>We supply the technical team, cloud infrastructure, and AI stack so your capital lasts 3x longer.</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '22px' }}>
                    <Link href="/submit-idea" className="primary" style={{ display: 'inline-flex', padding: '10px 18px', borderRadius: '999px', fontSize: '13px' }}>
                      Submit Your Plan for Diligence Review →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              STAGE 4: PROTOTYPE — THE LEAN MVP
              ==================================================================== */}
          {activeSection === 'prototype' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Stage 04 · Prototype</div>
                <h2>Build the Lean MVP</h2>
                <p>
                  A Minimum Viable Product is the smallest piece of software that solves the user’s primary pain point and begins
                  the build-measure-learn cycle. Avoid feature creep; build only what proves value.
                </p>
              </div>

              <div className="kh-visual-grid">
                <div className="kh-visual-side">
                  <div className="eyebrow">Lean Prototyping Principles</div>
                  <h3>How to scope an MVP that launches in weeks</h3>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">1</div>
                    <div>
                      <strong>One Core Workflow Only</strong>
                      <span>Identify the single feature that solves 80% of the user’s urgent problem. Strip away everything else.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">2</div>
                    <div>
                      <strong>Concierge / Wizard-of-Oz Testing</strong>
                      <span>Do manually behind the scenes what software would do later. Validate demand before automating.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">3</div>
                    <div>
                      <strong>Instrumentation from Day One</strong>
                      <span>Track user activation, daily return rate, and task completion. Data beats founder opinion.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">4</div>
                    <div>
                      <strong>Rapid Build Sprints with Ideacubator</strong>
                      <span>Our studio engineering team delivers production-grade prototypes in 4 to 8 weeks.</span>
                    </div>
                  </div>
                </div>

                <div className="kh-visual-side" style={{ background: 'var(--paper)' }}>
                  <div className="eyebrow">Masterclass Reference</div>
                  <h3>How to Build a Minimum Viable Product</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '14px' }}>
                    Practical lessons on defining scope, validating assumptions, and avoiding engineering waste:
                  </p>

                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--line)', marginBottom: '16px' }}>
                    <iframe
                      style={{ width: '100%', aspectRatio: '16/9', border: 'none', display: 'block' }}
                      src="https://www.youtube-nocookie.com/embed/1xe1adTOv24?rel=0&modestbranding=1"
                      title="How to Build a Minimum Viable Product (MVP)"
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>

                  <div>
                    <Link href="/submit-idea" className="primary" style={{ padding: '10px 18px', borderRadius: '999px', fontSize: '13px' }}>
                      Build Your MVP with Ideacubator →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              STAGE 5: LAUNCH — GO TO MARKET & EARLY TRACTION
              ==================================================================== */}
          {activeSection === 'launch' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Stage 05 · Launch</div>
                <h2>Go-to-Market &amp; Early Traction</h2>
                <p>
                  Product alone does not generate revenue. You need an aggressive, organic go-to-market engine to acquire your
                  first 100 passionate customers and build sustainable distribution loops.
                </p>
              </div>

              <div className="kh-path-grid">
                <article className="kh-path-card">
                  <div>
                    <div className="kh-path-time">Channel 01</div>
                    <h3>Founder-Led Direct Sales</h3>
                    <p>
                      Hand-pick 50 target prospects. Reach out via personalized email, LinkedIn, or phone. Listen to objections
                      and refine your pitch in real-time.
                    </p>
                  </div>
                  <span className="kh-path-link">Best for B2B &amp; Enterprise</span>
                </article>

                <article className="kh-path-card">
                  <div>
                    <div className="kh-path-time">Channel 02</div>
                    <h3>Community &amp; Wedge Infiltration</h3>
                    <p>
                      Participate actively in WhatsApp groups, Discord hubs, subreddits, and industry forums where your users
                      complain about existing tools.
                    </p>
                  </div>
                  <span className="kh-path-link">High organic conversion</span>
                </article>

                <article className="kh-path-card">
                  <div>
                    <div className="kh-path-time">Channel 03</div>
                    <h3>Content &amp; High-Signal Proof</h3>
                    <p>
                      Publish teardowns, case studies, and transparent build logs. Founders who educate their market build
                      enduring trust and zero-CAC organic inbound.
                    </p>
                  </div>
                  <span className="kh-path-link">Compounding flywheel</span>
                </article>

                <article className="kh-path-card">
                  <div>
                    <div className="kh-path-time">Channel 04</div>
                    <h3>Referral Loops &amp; Incentives</h3>
                    <p>
                      Build natural virality into your product workflow: collaborative workspaces, shared exports, or bilateral
                      incentives for inviting peers.
                    </p>
                  </div>
                  <span className="kh-path-link">Reduces CAC at scale</span>
                </article>
              </div>
            </div>
          )}

          {/* ====================================================================
              STAGE 6: GROW — SCALE, PRODUCT EVOLUTION & CAPITAL
              ==================================================================== */}
          {activeSection === 'grow' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Stage 06 · Grow</div>
                <h2>Scale, Product Evolution &amp; Expansion</h2>
                <p>
                  Once early traction is proven, optimize your product based on behavioral data, expand into adjacent customer
                  segments, fine-tune gross margins, and raise institutional capital.
                </p>
              </div>

              <div className="kh-visual-grid">
                <div className="kh-visual-side">
                  <div className="eyebrow">Product Optimization</div>
                  <h3>Adjusting the product to achieve true Product-Market Fit</h3>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">1</div>
                    <div>
                      <strong>Cohort Retention Curves</strong>
                      <span>Watch how many users come back in week 4 and week 12. If the curve flattens, you have retention.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">2</div>
                    <div>
                      <strong>Pruning Vanity Features</strong>
                      <span>Ruthlessly remove features that fewer than 5% of users touch. Simplify the primary core value.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">3</div>
                    <div>
                      <strong>Pricing &amp; Packaging Iteration</strong>
                      <span>Test value-metric pricing (per seat, per transaction, or tiered usage) to maximize expansion revenue.</span>
                    </div>
                  </div>

                  <div className="kh-flow-item">
                    <div className="kh-flow-no">4</div>
                    <div>
                      <strong>Automating Operational Workflows</strong>
                      <span>Replace manual onboarding hacks with seamless self-serve experiences and automated integrations.</span>
                    </div>
                  </div>
                </div>

                <div className="kh-visual-side" style={{ background: 'var(--paper)' }}>
                  <div className="eyebrow">Growth &amp; Funding Readiness</div>
                  <h3>Preparing for Scale Capital</h3>

                  <div className="kh-check-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
                    <div className="kh-check">
                      <strong>Positive Unit Economics</strong>
                      <span>LTV to CAC ratio exceeding 3:1, with payback period under 12 months.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Scalable Infrastructure</strong>
                      <span>Resilient cloud architecture capable of handling 100x traffic surges without latency spikes.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Investor Data Room</strong>
                      <span>Clean cap table, intellectual property assignments, financial forecasts, and audited traction metrics.</span>
                    </div>
                    <div className="kh-check">
                      <strong>Ideacubator Growth Network</strong>
                      <span>Direct introductions to seed funds, angel networks, and enterprise pilot partners.</span>
                    </div>
                  </div>

                  <div style={{ marginTop: '22px' }}>
                    <Link href="/submit-idea" className="primary" style={{ display: 'inline-flex', padding: '12px 22px', borderRadius: '999px', fontWeight: 800 }}>
                      Ready to Scale? Submit an Idea →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====================================================================
              FOUNDER TOOLS PLAYBOOK
              ==================================================================== */}
          {activeSection === 'tools' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Founder Tools</div>
                <h2>Interactive tools to accelerate execution.</h2>
                <p>
                  Practical tools and frameworks built into Ideacubator to produce actionable outputs you can test right away.
                </p>
              </div>

              <div className="kh-tools-grid">
                <article className="kh-tool-card">
                  <div>
                    <div className="kh-tool-icon">⌕</div>
                    <h3>Idea Discovery Test</h3>
                    <p>Surface the biggest unknown risks and critical assumptions in your startup hypothesis.</p>
                  </div>
                  <button type="button" onClick={() => selectSection('idea')} className="kh-text-link">
                    Explore Idea Stage →
                  </button>
                </article>

                <article className="kh-tool-card">
                  <div>
                    <div className="kh-tool-icon">◒</div>
                    <h3>Pitch Builder</h3>
                    <p>Work through the five core narrative boxes and prepare your high-conviction pitch.</p>
                  </div>
                  <button type="button" onClick={() => selectSection('pitch')} className="kh-text-link">
                    Build Pitch Story →
                  </button>
                </article>

                <article className="kh-tool-card">
                  <div>
                    <div className="kh-tool-icon" style={{ background: 'var(--brown)', color: '#fff' }}>✦</div>
                    <h3>AI Idea Review</h3>
                    <p>Instant evaluation of problem clarity, customer wedge, and recommended first MVP experiment.</p>
                  </div>
                  <Link href="/submit-idea" className="kh-text-link">Review with AI →</Link>
                </article>

                <article className="kh-tool-card">
                  <div>
                    <div className="kh-tool-icon">◫</div>
                    <h3>MVP Planner</h3>
                    <p>Define the leanest working software scope required to validate willingness to pay.</p>
                  </div>
                  <button type="button" onClick={() => selectSection('prototype')} className="kh-text-link">
                    Explore MVP Guide →
                  </button>
                </article>

                <article className="kh-tool-card">
                  <div>
                    <div className="kh-tool-icon">₹</div>
                    <h3>Unit Economics Model</h3>
                    <p>Map customer acquisition cost, pricing hypotheses, gross margins, and lifetime value.</p>
                  </div>
                  <button type="button" onClick={() => selectSection('plan')} className="kh-text-link">
                    Explore Modeling →
                  </button>
                </article>

                <article className="kh-tool-card">
                  <div>
                    <div className="kh-tool-icon">↗</div>
                    <h3>Launch Playbook</h3>
                    <p>Organize early adopter acquisition channels, referral loops, and customer feedback cadences.</p>
                  </div>
                  <button type="button" onClick={() => selectSection('launch')} className="kh-text-link">
                    See Launch Flow →
                  </button>
                </article>
              </div>
            </div>
          )}

          {/* ====================================================================
              DILIGENCE & FAQS
              ==================================================================== */}
          {activeSection === 'faq' && (
            <div className="kh-panel-view">
              <div className="kh-panel-head">
                <div className="eyebrow">Quick Answers</div>
                <h2>Frequently asked questions by founders.</h2>
                <p>Direct answers designed to save you hours of uncertainty.</p>
              </div>

              <div className="kh-faq-grid">
                <details className="kh-faq-item" open>
                  <summary>Can I apply if my idea is still early or rough?</summary>
                  <p>
                    Yes, absolutely. Apply whenever you can explain the core problem clearly enough for a meaningful first
                    conversation. We frequently partner with founders at stage zero.
                  </p>
                </details>

                <details className="kh-faq-item">
                  <summary>Do I need traction or revenue before applying?</summary>
                  <p>
                    No. If you have no traction yet, just be honest about what you’ve verified, what you’re currently testing,
                    and where you need technical or operational co-building.
                  </p>
                </details>

                <details className="kh-faq-item">
                  <summary>Do I retain 100% intellectual property ownership?</summary>
                  <p>
                    Yes. You retain complete, unencumbered ownership of your ideas, patents, and code. Ideacubator makes zero
                    claims on your IP during application or initial review.
                  </p>
                </details>

                <details className="kh-faq-item">
                  <summary>What happens after I submit my application?</summary>
                  <p>
                    Your application enters our diligence workspace. You receive an in-app workspace where you can chat with
                    the Ideacubator team in real-time, view status updates, and schedule diligence meetings.
                  </p>
                </details>

                <details className="kh-faq-item">
                  <summary>Will the AI review decide my acceptance?</summary>
                  <p>
                    No. The AI review is purely a thinking tool for you as a founder to sharpen your concept. All partnership
                    decisions are made directly by the human Ideacubator studio team.
                  </p>
                </details>

                <details className="kh-faq-item">
                  <summary>Can I schedule a meeting directly with the team?</summary>
                  <p>
                    Yes. Once you submit your application or sign into your workspace, you can schedule an in-app diligence
                    call directly on our calendar.
                  </p>
                </details>
              </div>
            </div>
          )}

          {/* ====================================================================
              STEP-THROUGH FOOTER CONTROLS: PREVIOUS / NEXT MILESTONE
              ==================================================================== */}
          <div className="kh-panel-footer-nav">
            {prevStage ? (
              <button
                type="button"
                onClick={() => selectSection(prevStage.id)}
                className="kh-step-nav-btn prev"
              >
                <span className="kh-step-nav-dir">← Previous</span>
                <span className="kh-step-nav-label">{prevStage.title}</span>
              </button>
            ) : (
              <div />
            )}

            {nextStage ? (
              <button
                type="button"
                onClick={() => selectSection(nextStage.id)}
                className="kh-step-nav-btn next"
              >
                <span className="kh-step-nav-dir">Next Milestone →</span>
                <span className="kh-step-nav-label">{nextStage.title}</span>
              </button>
            ) : (
              <Link href="/submit-idea" className="kh-step-nav-btn next highlight">
                <span className="kh-step-nav-dir">Ready to Build?</span>
                <span className="kh-step-nav-label">Submit an Idea →</span>
              </Link>
            )}
          </div>
        </main>
      </div>

      {/* ==========================================================================
          BOTTOM CALL TO ACTION BANNER
          ========================================================================== */}
      <section className="kh-cta-banner" style={{ marginTop: '48px' }}>
        <div className="eyebrow" style={{ color: '#ffd6bf' }}>Ready when you are</div>
        <h2>
          You don’t need to know <em>everything.</em><br />
          You need to take the next step.
        </h2>
        <p>
          Start with your profile and idea. Attach an optional deck or summary if you have one.
          Use our AI review for instant clarity. Submit when you’re ready.
        </p>
        <div>
          <Link href="/submit-idea" className="btn-cta">
            Submit Your Idea →
          </Link>
        </div>
      </section>
    </div>
  );
}
