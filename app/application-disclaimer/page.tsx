import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Application Disclaimer — Ideacubator',
  description: 'Application terms, evaluation disclaimers, and AI review guidance for Ideacubator applicants.'
};

export default function ApplicationDisclaimerPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Legal &amp; Governance</div>
            <h1 className="title">Application Disclaimer</h1>
            <p className="subtitle">Important notices regarding the founder application, venture evaluation, and AI assistance.</p>
          </div>
        </div>

        <div className="card pad" style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.7 }}>
          <div className="note" style={{ marginBottom: '24px' }}>
            Please review these disclaimers carefully prior to completing and submitting your founder application on Ideacubator.
          </div>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>1. Preliminary Intake Only</h3>
            <p>
              Submission of an idea, venture profile, or pitch material through this platform constitutes an initial intake for preliminary evaluation. It does not establish a partnership, joint venture, investment relationship, agency, or fiduciary obligation between you and Ideacubator.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>2. No Guarantee of Acceptance or Capital</h3>
            <p>
              Ideacubator receives applications across diverse industries. Submission does not guarantee acceptance into the studio, scheduling of an interview, provision of engineering resources, or allocation of capital. All decisions are at the sole discretion of our evaluation committee.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>3. AI-Assisted Idea Review</h3>
            <p>
              The &quot;Review my idea with AI&quot; capability offered during the submission flow is an optional preparation and clarity aid powered by machine intelligence.
            </p>
            <ul style={{ paddingLeft: '20px', color: 'var(--ink-2)', marginTop: '8px' }}>
              <li><strong>Not an Investment Decision:</strong> AI analysis does not represent the investment thesis or official view of the Ideacubator committee.</li>
              <li><strong>No Success Guarantee:</strong> High clarity scores or positive suggestions do not imply market success or guarantee investment.</li>
              <li><strong>Not Legal or Financial Advice:</strong> AI reviews should not replace formal legal, regulatory, tax, or investment counsel.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>4. Accuracy &amp; Third-Party Obligations</h3>
            <p>
              Applicants are solely responsible for ensuring that their submissions are accurate, truthful, and do not infringe on the intellectual property, non-compete agreements, or employment obligations owed to third parties.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>5. Questions</h3>
            <div className="note" style={{ marginTop: '10px' }}>
              For clarifications regarding this disclaimer or the application process:<br />
              <strong>Ideacubator Operations</strong><br />
              Email: <a href="mailto:team@ideacubator.in" style={{ color: 'var(--brown)', textDecoration: 'underline' }}>team@ideacubator.in</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
