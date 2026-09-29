import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'About Ideacubator & Founder — Brijesh | Venture Studio',
  description: 'About Ideacubator and founder Brijesh — 20+ years of technology leadership, complex systems transformation, and AI product engineering across North America, Europe and APAC.'
};

export default function AboutPage() {
  return (
    <main className="container" style={{ paddingBottom: '90px' }}>
      {/* ── ABOUT HERO ── */}
      <section className="about-hero" style={{ padding: '70px 0 50px' }}>
        <div className="about-hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '50px', alignItems: 'center' }}>
          <div>
            <div className="eyebrow">About Ideacubator</div>
            <h1 className="title" style={{ fontSize: 'clamp(28px, 3.4vw, 42px)', lineHeight: 1.18, letterSpacing: '-0.025em', margin: '12px 0 16px' }}>
              Ideas are everywhere.<br />
              <em style={{ color: 'var(--brown)', fontStyle: 'italic' }}>Building them is the real discipline.</em>
            </h1>
            <p className="subtitle" style={{ fontSize: '18px', color: 'var(--ink-2)', lineHeight: 1.65, margin: '0 0 32px' }}>
              Ideacubator was created to bridge the chasm between raw ambition and scalable, real-world execution. We bring institutional experience, modern engineering, and disciplined venture building to high-conviction ideas.
            </p>

            <div className="hero-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div className="meta-box" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <strong style={{ fontSize: '28px', fontFamily: '"DM Serif Display", Georgia, serif', color: 'var(--brown)', display: 'block', lineHeight: 1, marginBottom: '6px' }}>
                  20+
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.4, display: 'block' }}>
                  Years of technology &amp; complex systems delivery
                </span>
              </div>
              <div className="meta-box" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <strong style={{ fontSize: '28px', fontFamily: '"DM Serif Display", Georgia, serif', color: 'var(--brown)', display: 'block', lineHeight: 1, marginBottom: '6px' }}>
                  3
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.4, display: 'block' }}>
                  Global operating regions: North America, Europe &amp; APAC
                </span>
              </div>
              <div className="meta-box" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                <strong style={{ fontSize: '28px', fontFamily: '"DM Serif Display", Georgia, serif', color: 'var(--brown)', display: 'block', lineHeight: 1, marginBottom: '6px' }}>
                  5+
                </strong>
                <span style={{ fontSize: '12px', color: 'var(--ink-2)', lineHeight: 1.4, display: 'block' }}>
                  Years focused on practical AI &amp; intelligent products
                </span>
              </div>
            </div>
          </div>

          <div className="card pad" style={{ background: 'var(--paper-2)', borderColor: 'var(--line)' }}>
            <div className="eyebrow">Our Guiding Principle</div>
            <h3 style={{ fontSize: '22px', margin: '12px 0 10px', letterSpacing: '-0.025em' }}>
              Execution is the ultimate moat.
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Most ideas don’t fail because the founder lacked passion. They stall because the gap between an early concept and an engineered, validated product is fraught with architectural, strategic, and distribution pitfalls.
            </p>
            <div className="divider" style={{ borderTop: '1px solid var(--line)', margin: '20px 0' }} />
            <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>
              Ideacubator provides a serious, hands-on partner that designs, builds, and launches with you—not from the sidelines, but in the codebase and with early customers.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOUNDER PROFILE SECTION ── */}
      <section style={{ padding: '40px 0', borderTop: '1px solid var(--line)' }}>
        <div className="eyebrow">The Founder Behind Ideacubator</div>
        <h2 className="title" style={{ fontSize: 'clamp(24px, 2.8vw, 32px)', margin: '10px 0 16px' }}>
          Grounded in real-world systems.
        </h2>
        <p className="subtitle" style={{ maxWidth: '680px', color: 'var(--ink-2)', fontSize: '15px', marginBottom: '32px' }}>
          Ideacubator is led by senior practitioners with decades of hands-on delivery, not theoretical advisors.
        </p>

        <div className="founder-card" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: '20px', alignItems: 'stretch' }}>
          <div className="founder-photo-wrap" style={{ position: 'relative', borderRadius: 'var(--radius)', overflow: 'hidden', minHeight: '480px', border: '1px solid var(--line)' }}>
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

          <div className="founder-text-pane" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '44px', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: '20px', margin: '0 0 16px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
              20+ years of technology leadership &amp; transformation
            </h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.65, margin: '0 0 14px' }}>
              Brijesh has spent more than two decades designing, architecting, and delivering software systems, leading large-scale digital transformations and steering complex technology initiatives across <strong>North America, Europe and APAC</strong>.
            </p>
            <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.65, margin: '0 0 14px' }}>
              His industry experience spans <strong>financial services and healthcare</strong>—two of the world’s most demanding, heavily regulated, and high-consequence domains. In these environments, reliability, architectural clarity, and data privacy are absolute necessities.
            </p>
            <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.65, margin: '0 0 20px' }}>
              For the past <strong>five-plus years</strong>, his focus has been dedicated to <strong>AI and AI-powered product development</strong>, investigating how modern LLMs, automated agentic pipelines, and machine intelligence reshape business mechanics and unlock unprecedented speed to market.
            </p>

            <div className="chips-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '24px' }}>
              <span className="chip-item">Software Architecture</span>
              <span className="chip-item">Complex Systems Transformation</span>
              <span className="chip-item">Financial Services</span>
              <span className="chip-item">Healthcare Technology</span>
              <span className="chip-item">AI Product Engineering</span>
              <span className="chip-item">Global Cross-Border Delivery</span>
              <span className="chip-item">Product Strategy</span>
            </div>

            <div className="quote-box" style={{ marginTop: '30px', paddingTop: '24px', borderTop: '1px solid var(--line)', fontFamily: '"DM Serif Display", Georgia, serif', fontSize: '20px', color: 'var(--brown)', fontStyle: 'italic', lineHeight: 1.4 }}>
              “What happens when a great idea meets the right experience, technology, and execution?”
            </div>
          </div>
        </div>
      </section>

      {/* ── VENTURE STUDIO MANIFESTO ── */}
      <section style={{ padding: '50px 0 20px', borderTop: '1px solid var(--line)' }}>
        <div className="eyebrow">The Studio Manifesto</div>
        <h2 className="title" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', margin: '10px 0 16px' }}>
          Why the traditional startup advice model is broken.
        </h2>
        <p className="subtitle" style={{ marginBottom: '32px', color: 'var(--ink-2)', maxWidth: '680px' }}>
          Traditional incubators talk. Software agencies bill hours. Ideacubator actually co-creates scalable ventures.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px' }}>
          {/* Card 1 */}
          <div className="card pad" style={{ borderTop: '3px solid var(--red)' }}>
            <div className="eyebrow" style={{ color: 'var(--red)', marginBottom: '8px' }}>The Traditional Accelerator Trap</div>
            <h3 style={{ fontSize: '18px', margin: '0 0 8px' }}>All Advice, Zero Code</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Most accelerators offer 12 weeks of pitch deck polishing, slide templates, and classroom lectures—but write zero lines of code. Founders leave with advice but no product.
            </p>
          </div>

          {/* Card 2 */}
          <div className="card pad" style={{ borderTop: '3px solid var(--amber)' }}>
            <div className="eyebrow" style={{ color: 'var(--amber)', marginBottom: '8px' }}>The Outsourced Agency Trap</div>
            <h3 style={{ fontSize: '18px', margin: '0 0 8px' }}>High Fees, Zero Commercial Skin</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              Dev agencies charge steep billable hours and don&apos;t care whether the software actually solves a customer problem or generates revenue. When the budget runs out, founders are left with fragile code they cannot maintain.
            </p>
          </div>

          {/* Card 3 */}
          <div className="card pad" style={{ borderTop: '3px solid var(--green)', background: 'var(--paper-2)' }}>
            <div className="eyebrow" style={{ color: 'var(--green)', marginBottom: '8px' }}>The Ideacubator Standard</div>
            <h3 style={{ fontSize: '18px', margin: '0 0 8px' }}>Practitioners in the Codebase</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              We partner directly as your technical co-creator. We architect systems, write clean production code, integrate enterprise AI pipelines, and validate commercial traction together.
            </p>
          </div>
        </div>
      </section>

      {/* ── CORE METHODOLOGY SECTION ── */}
      <section style={{ padding: '50px 0 20px', borderTop: '1px solid var(--line)' }}>
        <div className="eyebrow">The Ideacubator Standard</div>
        <h2 className="title" style={{ fontSize: 'clamp(22px, 2.6vw, 30px)', margin: '10px 0 16px' }}>
          How we work with founders.
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '18px', marginTop: '28px' }}>
          <div className="card pad">
            <div style={{ color: 'var(--brown)', fontSize: '24px', fontWeight: 800, marginBottom: '12px', fontFamily: '"DM Serif Display", serif' }}>
              01
            </div>
            <h3 style={{ fontSize: '18px', margin: '0 0 8px' }}>Objective Problem Discovery</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              We stress-test the core problem and customer economics immediately. We do not build software for imaginary problems.
            </p>
          </div>

          <div className="card pad">
            <div style={{ color: 'var(--brown)', fontSize: '24px', fontWeight: 800, marginBottom: '12px', fontFamily: '"DM Serif Display", serif' }}>
              02
            </div>
            <h3 style={{ fontSize: '18px', margin: '0 0 8px' }}>Surgical Scope</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              We cut feature bloat and hone in on the single workflow that delivers tangible value to the first paying cohort.
            </p>
          </div>

          <div className="card pad">
            <div style={{ color: 'var(--brown)', fontSize: '24px', fontWeight: 800, marginBottom: '12px', fontFamily: '"DM Serif Display", serif' }}>
              03
            </div>
            <h3 style={{ fontSize: '18px', margin: '0 0 8px' }}>Production-Grade Engineering</h3>
            <p style={{ color: 'var(--ink-2)', fontSize: '14px', margin: 0, lineHeight: 1.6 }}>
              No fragile throwaway prototypes. Everything is built on clean foundations with strict security, privacy, and scale.
            </p>
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ── */}
      <section className="cta-banner" style={{ background: 'var(--brown)', color: '#ffffff', padding: '60px 40px', borderRadius: 'var(--radius)', textAlign: 'center', marginTop: '60px' }}>
        <h2 style={{ color: '#ffffff', marginBottom: '12px', fontFamily: '"DM Serif Display", serif', fontSize: '32px' }}>
          Have an idea worth building?
        </h2>
        <p style={{ color: 'rgba(255, 255, 255, 0.85)', maxWidth: '600px', margin: '0 auto 28px', fontSize: '16px' }}>
          Whether you’re at initial concept, early wireframe, or looking for seasoned technical co-builders, let’s discuss how to move forward.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="primary" href="/submit-idea" style={{ background: '#fff', color: 'var(--brown)', borderColor: '#fff', padding: '14px 28px', fontSize: '14px' }}>
            Submit an Idea →
          </Link>
          <Link className="secondary" href="/contact" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.4)', padding: '14px 24px', fontSize: '14px' }}>
            Contact the Studio
          </Link>
        </div>
      </section>
    </main>
  );
}
