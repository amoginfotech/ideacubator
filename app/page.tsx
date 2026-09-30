'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleOpenVideo = () => {
    setIsVideoModalOpen(true);
    setTimeout(() => {
      if (modalVideoRef.current) {
        modalVideoRef.current.play().catch(() => {});
      }
    }, 150);
  };

  const handleCloseVideo = () => {
    if (modalVideoRef.current) {
      modalVideoRef.current.pause();
    }
    setIsVideoModalOpen(false);
  };

  const faqs = [
    {
      q: 'Do I need a technical background or coding skills to submit an idea?',
      a: 'No. Many of our strongest venture partnerships are with domain specialists, doctors, enterprise executives, and corporate leaders who have deep industry problem insights. Ideacubator provides the software architecture, full-stack engineering, and applied AI systems to bring your concept to life.'
    },
    {
      q: 'How does the Ideacubator partnership and commercial model work?',
      a: 'We operate as an active venture co-builder, not an hourly fee contractor or academic program. Depending on your venture stage and starting point, our engagement model combines technical sweat equity, milestone-driven co-creation, and shared upside aligned with your success.'
    },
    {
      q: 'Who owns the intellectual property (IP) of the idea and software?',
      a: 'You do. Submitting your idea creates no claim on your concept. All intellectual property, proprietary domain knowledge, and created assets remain under the founder\'s ownership until formal joint venture agreements are executed.'
    },
    {
      q: 'How fast do we move from submission to execution?',
      a: 'We move at founder speed. Focused validation sprints and strategic alignment can close in days or a week, while complete production builds proceed with disciplined momentum—free from slow academic semesters or corporate delays.'
    },
    {
      q: 'What if I only want to test market appetite before leaving my job?',
      a: 'We offer low-risk Validation Sprints (Starting Point 03) specifically designed to test problem severity, buyer willingness-to-pay, and market signal before committing capital or making major career transitions.'
    },
    {
      q: 'Does Ideacubator invest capital directly or help raise funding?',
      a: 'We co-invest our technical and architectural resources directly into the venture. Once validated with initial traction, we prepare your institutional data room and introduce your venture directly to qualified angel syndicates, family offices, and seed venture funds.'
    }
  ];

  const capabilities = [
    {
      icon: '💡',
      title: 'Validation & Problem Discovery',
      tag: 'Phase 1 · Foundation',
      desc: 'Clarify problem-solution fit, run targeted customer interviews, evaluate market sizing, test willingness-to-pay, and eliminate unvalidated assumptions.'
    },
    {
      icon: '📐',
      title: 'Venture Strategy & Product Scoping',
      tag: 'Phase 2 · Architecture',
      desc: 'Translate ambiguous concepts into concise product requirement specifications, user journeys, iterative milestones, and a laser-focused MVP blueprint.'
    },
    {
      icon: '⚡',
      title: 'Production-Grade Engineering',
      tag: 'Phase 3 · Build',
      desc: 'Full-stack modern software development for web, mobile, and cloud backends. Clean, secure, compliant, scalable code—no throwaway prototypes.'
    },
    {
      icon: '🤖',
      title: 'Applied AI & Autonomous Systems',
      tag: 'Technology · AI Focus',
      desc: 'Practical enterprise machine intelligence: custom LLM agent pipelines, intelligent workflow automation, embeddings search, and private inference infrastructure.'
    },
    {
      icon: '🚀',
      title: 'Go-to-Market & Initial Traction',
      tag: 'Phase 4 · Distribution',
      desc: 'Positioning and messaging, initial user onboarding funnels, analytics instrumentation, customer feedback loops, and rapid product iteration.'
    },
    {
      icon: '🤝',
      title: 'Capital Readiness & Investor Mandate',
      tag: 'Phase 5 · Expansion',
      desc: 'Preparing institutional data rooms, financial models, pitch presentations, due diligence materials, and targeted introductions to qualified angel and venture investors.'
    }
  ];

  const startingPoints = [
    {
      num: '01 · Campus Founders',
      title: 'Student Innovators & Researchers',
      desc: 'Validation discipline, structured mentorship, and hands-on technical co-building for breakthrough ideas.'
    },
    {
      num: '02 · Domain Professionals',
      title: 'Executives & Industry Specialists',
      desc: 'Transforming deep domain insights into scalable software products with an expert engineering and AI co-builder team.'
    },
    {
      num: '03 · Low-Risk Testing',
      title: 'Idea Validation Sprints',
      desc: 'Fast, targeted testing of market appetite, customer demand, and willingness-to-pay before committing major capital.'
    },
    {
      num: '04 · Growth & Scaling',
      title: 'AI & Product Modernization',
      desc: 'Upgrading existing products with enterprise cloud architecture, custom LLM workflows, and automated systems to scale 10x.'
    },
    {
      num: '05 · Ready for Capital',
      title: 'Pre-Seed & Angel Readiness',
      desc: 'Product polish, analytics instrumentation, financial modeling, and clean data room preparation for early funding rounds.'
    },
    {
      num: '06 · Valuation & Audits',
      title: 'Venture & Tech Valuation',
      desc: 'Fundamental code health checks, software architecture stress-testing, IP asset evaluation, and commercial viability audits.'
    },
    {
      num: '07 · India to Global',
      title: 'Cross-Border Outbound (Global & GCC)',
      desc: 'Helping proven Indian products expand into APAC, North America, Europe, and GCC markets with localized GTM and tech positioning.'
    },
    {
      num: '08 · Global to India',
      title: 'Cross-Border Inbound (Global & GCC)',
      desc: 'Partnering with international ventures and GCC companies to execute local tech customization, engineering delivery, and market entry.'
    }
  ];

  return (
    <main>
      {/* ── HERO SECTION ── */}
      <section className="hero" id="top">
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="badge" style={{ marginBottom: '12px', background: 'var(--cream)', color: 'var(--brown)', fontSize: '11px', fontWeight: 700, padding: '5px 12px', border: '1px solid var(--brown-soft)', display: 'inline-flex' }}>
              Hands-On Venture Studio &amp; Technical Co-Builder
            </div>
            <div className="eyebrow">Ideas into Companies</div>
            <h1>
              Explore, shape, build, launch <em>and grow.</em>
            </h1>
            <p>
              We partner with founders, domain experts, and builders to turn concepts into real, scalable ventures through structured product strategy, hands-on engineering, custom AI, and execution.
            </p>
            <div className="hero-actions">
              <Link className="primary" href="/submit-idea" style={{ padding: '13px 26px', fontSize: '14px' }}>
                Submit an Idea →
              </Link>
              <button className="secondary" type="button" onClick={handleOpenVideo} style={{ padding: '13px 22px', fontSize: '14px' }}>
                Watch how it works
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: 'var(--ink-3)', fontWeight: 500 }}>
              No polished pitch deck required to start—just bring your core concept.
            </p>
            <div className="hero-note">
              <span><b>✓</b> Founder-first venture building</span>
              <span><b>✓</b> Product, engineering &amp; AI</span>
              <span><b>✓</b> From concept to launch</span>
            </div>
          </div>

          {/* VIDEO INTRO CARD */}
          <div className="video-card">
            <div className="video-shell">
              <video className="video-bg" playsInline muted loop autoPlay preload="metadata">
                <source src="/assets/hero-video.mp4" type="video/mp4" />
              </video>
              <div className="video-art">
                <div className="video-copy">
                  <small>Overview · Watch Demo</small>
                  <strong>The Ideacubator Journey</strong>
                </div>
                <button className="play-btn" type="button" aria-label="Play video with sound" onClick={handleOpenVideo}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="video-meta">
              <span>Explore → Shape → Validate → Build → Launch → Grow</span>
              <span>Structured venture partner</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST STRIP ── */}
      <section className="trust-strip" id="about-overview">
        <div className="container trust-grid">
          <div className="trust-label">The Venture Platform</div>
          <div className="trust-item">
            <strong>Early validation</strong>
            <span>Clarify problem &amp; customer first</span>
          </div>
          <div className="trust-item">
            <strong>Hands-on build</strong>
            <span>Modern software &amp; AI architectures</span>
          </div>
          <div className="trust-item">
            <strong>Go-to-market</strong>
            <span>First users, revenue &amp; positioning</span>
          </div>
          <div className="trust-item">
            <strong>Institutional experience</strong>
            <span>20+ years of global execution</span>
          </div>
        </div>
      </section>

      {/* ── THE JOURNEY (5-STAGE ROADMAP) ── */}
      <section className="section journey-section" id="journey">
        <div className="container">
          <div className="journey-head">
            <div>
              <div className="eyebrow">The Founder Journey</div>
              <h2 className="title" style={{ fontSize: 'clamp(26px, 3vw, 36px)', margin: '8px 0 12px' }}>
                A disciplined path from idea to business.
              </h2>
            </div>
            <p className="journey-intro">
              We don&apos;t impose rigid academic semesters or months of bureaucratic reviews. Whether your venture needs a fast validation sprint or comprehensive technical co-building and <strong>go-to-market execution</strong>, our partnership moves with founder speed and absolute commercial clarity.
            </p>
          </div>

          {/* STAGES 01 - 03 (TOP ROW) */}
          <div className="journey-grid">
            {/* STAGE 01 */}
            <div className="journey-card">
              <div>
                <div className="journey-card-top">
                  <span className="journey-step-badge">Phase 01</span>
                  <span className="journey-phase-tag">Alignment</span>
                </div>
                <h3>Explore &amp; Discover</h3>
                <p>
                  Submit your concept through our low-friction intake. We evaluate problem depth, market realities, and founder vision in a direct 1-on-1 discovery session with principal builders.
                </p>
              </div>
              <div className="journey-deliverable">
                <span>✦</span>
                <div><strong>Deliverable:</strong> Mutual conviction &amp; strategic roadmap</div>
              </div>
            </div>

            {/* STAGE 02 */}
            <div className="journey-card">
              <div>
                <div className="journey-card-top">
                  <span className="journey-step-badge">Phase 02</span>
                  <span className="journey-phase-tag">Architecture</span>
                </div>
                <h3>Shape &amp; Blueprint</h3>
                <p>
                  Eliminate unnecessary complexity to carve a razor-sharp MVP specification and go-to-market wedge. We define the user journey, tech stack, database models, and practical AI opportunities that create an unfair advantage.
                </p>
              </div>
              <div className="journey-deliverable">
                <span>◈</span>
                <div><strong>Deliverable:</strong> Surgical product scope &amp; GTM wedge</div>
              </div>
            </div>

            {/* STAGE 03 */}
            <div className="journey-card">
              <div>
                <div className="journey-card-top">
                  <span className="journey-step-badge">Phase 03</span>
                  <span className="journey-phase-tag">De-Risking</span>
                </div>
                <h3>Rapid Validation</h3>
                <p>
                  Stress-test core assumptions with real prospective users before heavy development. We test willingness-to-pay, validate demand signals, and eliminate guesswork early.
                </p>
              </div>
              <div className="journey-deliverable">
                <span>◉</span>
                <div><strong>Deliverable:</strong> Verified customer signal &amp; early intent</div>
              </div>
            </div>
          </div>

          {/* STAGES 04 - 05 (BOTTOM ROW) */}
          <div className="journey-grid-bottom">
            {/* STAGE 04 */}
            <div className="journey-card">
              <div>
                <div className="journey-card-top">
                  <span className="journey-step-badge" style={{ background: 'var(--brown)', color: '#fff', borderColor: 'var(--brown)' }}>
                    Phase 04 · Core Co-Build
                  </span>
                  <span className="journey-phase-tag">Full-Stack &amp; AI</span>
                </div>
                <h3>Hands-On Engineering</h3>
                <p>
                  We work directly in the codebase alongside you. Full-stack cloud software, scalable APIs, intuitive UI/UX design, and custom LLM/AI workflows—built for production scale, never throwaway prototypes.
                </p>
              </div>
              <div className="journey-deliverable">
                <span>⚙</span>
                <div><strong>Deliverable:</strong> Production-grade software ready for market</div>
              </div>
            </div>

            {/* STAGE 05 */}
            <div className="journey-card">
              <div>
                <div className="journey-card-top">
                  <span className="journey-step-badge">Phase 05</span>
                  <span className="journey-phase-tag">Distribution &amp; Capital</span>
                </div>
                <h3>Go-to-Market, Traction &amp; Scale</h3>
                <p>
                  Even the best product needs systematic customer distribution to win. We partner directly on your go-to-market motion—onboarding initial paying cohorts, instrumenting user telemetry, refining positioning, and preparing clean institutional data rooms for angel and venture rounds.
                </p>
              </div>
              <div className="journey-deliverable">
                <span>▲</span>
                <div><strong>Deliverable:</strong> Executed go-to-market, paying customers &amp; investor readiness</div>
              </div>
            </div>
          </div>

          {/* VELOCITY & AGILITY STRIP */}
          <div className="journey-agility-strip">
            <div>
              <span>⚡</span>
              <span>Execution at Founder Speed</span>
            </div>
            <p>
              Disciplined execution with immediate momentum—focused validation sprints begin in days, while complete software builds proceed with structured velocity.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW WE HELP / CAPABILITIES ── */}
      <section className="section" id="how-we-help" style={{ padding: '90px 0', background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container" id="capabilities">
          <div className="section-head" style={{ marginBottom: '36px' }}>
            <div>
              <div className="eyebrow">Our Capabilities</div>
              <h2 className="title" style={{ fontSize: 'clamp(24px, 2.8vw, 34px)', margin: '8px 0 10px' }}>
                How Ideacubator helps.
              </h2>
            </div>
            <p className="subtitle" style={{ maxWidth: '640px' }}>
              We don’t just give advice or point to templates. We partner directly as your venture builder, providing hands-on product strategy, deep-tech engineering, applied AI, and market execution.
            </p>
          </div>

          <div className="services-grid">
            {capabilities.map((c, i) => (
              <div className="service" key={i}>
                <div>
                  <div className="service-icon">{c.icon}</div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
                <span className="service-tag">{c.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE WORK WITH / STARTING POINTS ── */}
      <section className="section" id="starting-points" style={{ padding: '90px 0' }}>
        <div className="container" id="audience">
          <div className="section-head" style={{ marginBottom: '36px' }}>
            <div>
              <div className="eyebrow">Starting Points</div>
              <h2 className="title" style={{ fontSize: 'clamp(24px, 2.8vw, 34px)', margin: '8px 0 10px' }}>
                Who We Build With
              </h2>
            </div>
            <p className="subtitle" style={{ maxWidth: '640px' }}>
              From early validation and deep-tech co-building to valuation and cross-border expansion, choose the starting point that fits your current reality.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {startingPoints.map((sp, i) => (
              <div className="audience-card" key={i}>
                <span className="mini">{sp.num}</span>
                <h3>{sp.title}</h3>
                <p>{sp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER HIGHLIGHT ── */}
      <section className="section" id="founder" style={{ padding: '90px 0', background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container">
          <div className="founder-wrap">
            <div className="founder-photo-wrap">
              <Image
                src="/assets/img/founder.jpg"
                alt="Brijesh — Founder & Technologist"
                width={600}
                height={700}
                className="founder-photo-img"
                style={{ objectFit: 'cover' }}
                priority
              />
              <div className="founder-photo-overlay">
                <small>Founder &amp; Technologist</small>
                <strong>Brijesh</strong>
              </div>
            </div>

            <div className="founder-panel founder-story">
              <div className="eyebrow">Behind Ideacubator</div>
              <h3>20+ years of technology, transformation and execution.</h3>
              <p>
                Brijesh has spent over two decades designing, architecting, and delivering software systems, leading complex technology transformations across <strong>North America, Europe and APAC</strong>.
              </p>
              <p>
                His industry track record spans <strong>financial services and healthcare</strong>, along with driving business development and scaling new APAC revenue streams for an American mid-scale technology company.
              </p>
              <p>
                Over the past 5+ years, his focus has centered on <strong>AI and AI-powered product development</strong>. He has built numerous MVPs for in-house ideas and customer ventures, while actively mentoring founders from ideation to launch and advising startups on legal establishment and registrations through bodies like <strong>NASSCOM</strong>.
              </p>
              <p style={{ margin: '22px 0' }}>
                <em>“What happens when a great idea meets the right experience, technology and execution?”</em>
              </p>

              <div className="founder-facts">
                <div className="fact">
                  <strong>20+ years</strong>
                  <span>Industry experience</span>
                </div>
                <div className="fact">
                  <strong>3 regions</strong>
                  <span>North America · Europe · APAC</span>
                </div>
                <div className="fact">
                  <strong>5+ years</strong>
                  <span>AI product focus</span>
                </div>
              </div>

              <div style={{ marginTop: '28px' }}>
                <Link className="secondary" href="/about" style={{ padding: '12px 20px', fontSize: '13px' }}>
                  Read About Ideacubator &amp; Brijesh →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ SECTION ── */}
      <section className="section" id="faq" style={{ padding: '80px 0', background: 'var(--paper-2)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
        <div className="container" style={{ maxWidth: '860px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="eyebrow" style={{ justifyContent: 'center' }}>Frequently Asked Questions</div>
            <h2 className="title" style={{ margin: '10px 0 12px', fontSize: 'clamp(24px, 2.8vw, 32px)' }}>
              Everything you need to know.
            </h2>
            <p className="subtitle" style={{ margin: '0 auto' }}>
              Clear answers about our venture co-building model, intellectual property protection, sprint timelines, and commercial structure.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {faqs.map((f, i) => (
              <div key={i} className="card" style={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)', overflow: 'hidden', background: 'var(--surface)' }}>
                <button
                  type="button"
                  aria-expanded={openFaq === i}
                  onClick={() => toggleFaq(i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '18px 22px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: 'var(--ink)',
                    cursor: 'pointer'
                  }}
                >
                  <span>{f.q}</span>
                  <span style={{ fontSize: '16px', color: 'var(--brown)', flexShrink: 0, fontWeight: 700 }}>
                    {openFaq === i ? '−' : '＋'}
                  </span>
                </button>
                {openFaq === i && (
                  <div style={{ padding: '0 22px 18px', fontSize: '14px', lineHeight: 1.6, color: 'var(--ink-2)', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA SECTION ── */}
      <section className="section cta-section" id="submit-section">
        <div className="container">
          {/* ── FOUNDER TRUST & IP OWNERSHIP BANNER ── */}
          <div
            className="founder-trust-banner"
            style={{
              marginBottom: '32px',
              padding: '24px 28px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, var(--cream) 0%, var(--surface) 100%)',
              border: '1px solid var(--brown-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', maxWidth: '820px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'var(--brown)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  flexShrink: 0,
                  marginTop: '2px'
                }}
              >
                🔒
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>
                  Complete IP &amp; Founder Ownership
                </h3>
                <p style={{ margin: 0, fontSize: '14.5px', lineHeight: 1.6, color: 'var(--ink-2)' }}>
                  You retain 100% ownership of your intellectual property, code, and trade secrets from day one. Mutual NDA and strict confidentiality guaranteed before every discovery session.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brown)', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>
              <span>✓ 100% IP Retained</span>
              <span style={{ opacity: 0.35 }}>•</span>
              <span>✓ Mutual NDA</span>
            </div>
          </div>

          <div className="cta-box">
            <div className="eyebrow" style={{ color: '#ffd7c0' }}>Start with the idea</div>
            <h2>
              Bring what you have.<br />
              <em>We’ll help build what comes next.</em>
            </h2>
            <p>
              A simple, focused application. No complicated pitch deck required. Complete the profile, describe your idea, optionally review it with our structured AI assistant, and step into your workspace.
            </p>
            <div className="cta-actions">
              <Link className="primary" href="/submit-idea" style={{ background: '#fff', color: 'var(--brown)', borderColor: '#fff', padding: '14px 28px', fontSize: '14px' }}>
                Submit an Idea →
              </Link>
              <Link className="secondary" href="#journey" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.4)', padding: '14px 24px', fontSize: '14px' }}>
                Review the journey
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── VIDEO MODAL ── */}
      <div className={`video-modal ${isVideoModalOpen ? 'open' : ''}`} role="dialog" aria-modal="true" aria-label="Ideacubator introduction">
        <div className="video-modal-inner">
          <button className="modal-close" type="button" aria-label="Close video" onClick={handleCloseVideo}>
            ×
          </button>
          <video ref={modalVideoRef} className="video-frame" controls playsInline preload="metadata">
            <source src="/assets/hero-video.mp4" type="video/mp4" />
            Your browser does not support HTML5 video.
          </video>
        </div>
      </div>
    </main>
  );
}
