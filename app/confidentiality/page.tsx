import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Confidentiality & IP Notice — Ideacubator',
  description: 'Confidentiality protocols, submission guidelines, and intellectual property protection framework at Ideacubator.'
};

export default function ConfidentialityPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Legal &amp; Governance</div>
            <h1 className="title">Confidentiality &amp; IP Notice</h1>
            <p className="subtitle">Submission protocols, information safeguarding, and bilateral NDA guidelines.</p>
          </div>
        </div>

        <div className="card pad" style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.7 }}>
          <div className="note" style={{ marginBottom: '24px' }}>
            This notice outlines our protocols for handling startup proposals, founder materials, and intellectual property during initial evaluation.
          </div>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>1. The Spirit of Our Confidentiality Commitment</h3>
            <p>
              Ideacubator was created by builders and technologists who understand the immense value and sensitivity of innovative business concepts. We treat your materials with professional care and respect. We do not broadcast your submissions or share your ideas with competing teams.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>2. What to Disclose at Intake Stage</h3>
            <p>
              Our initial intake form is designed to evaluate <strong>problem-solution viability, market scale, and execution readiness</strong>. You do NOT need to disclose:
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--ink-2)' }}>
              <li>Proprietary algorithms, mathematical weights, or raw source code repositories.</li>
              <li>Unfiled patent specifications or trade secret manufacturing processes.</li>
              <li>Confidential customer lists, non-public contracts, or PII of your existing users.</li>
            </ul>
            <p style={{ marginTop: '10px' }}>
              Share high-level descriptions, public architecture summaries, customer personas, and verified traction metrics.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>3. Internal Review Protocols</h3>
            <p>
              Your submission is accessible strictly to authorized members of the Ideacubator evaluation committee, venture partners, and assigned engineering leads. All team members are bound by comprehensive internal confidentiality covenants.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>4. Formal Bilateral NDAs</h3>
            <p>
              As conversations advance past the preliminary exploratory phase—into deep technical due diligence, proprietary AI architecture reviews, or term sheet structuring—Ideacubator will execute a formal bilateral Non-Disclosure Agreement (NDA) to provide comprehensive legal protection for confidential technical disclosures.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>5. Questions Regarding IP</h3>
            <div className="note" style={{ marginTop: '10px' }}>
              If you have questions regarding intellectual property handling or require a specific NDA review before deep diligence, contact:<br />
              <strong>Ideacubator Legal Department</strong><br />
              Email: <a href="mailto:team@ideacubator.in" style={{ color: 'var(--brown)', textDecoration: 'underline' }}>team@ideacubator.in</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
