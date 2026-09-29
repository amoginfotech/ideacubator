import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy — Ideacubator',
  description: 'Privacy Policy governing personal data processing, founder information, and applicant confidentiality at Ideacubator.'
};

export default function PrivacyPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Legal &amp; Governance</div>
            <h1 className="title">Privacy Policy</h1>
            <p className="subtitle">Effective Date: April 1, 2026 · Compliant with DPDP Act, 2023 &amp; International Standards</p>
          </div>
        </div>

        <div className="card pad" style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.7 }}>
          <div className="note" style={{ marginBottom: '24px' }}>
            Ideacubator (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is dedicated to protecting the privacy, confidentiality, and data rights of founders, applicants, investors, and website visitors.
          </div>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>1. Information We Collect</h3>
            <p>When you interact with our website or submit an idea, we collect information you directly provide:</p>
            <ul style={{ paddingLeft: '20px', color: 'var(--ink-2)' }}>
              <li><strong>Founder Profile:</strong> Full name, verified email address, telephone number, geographic location, current professional role, and years of experience.</li>
              <li><strong>Idea &amp; Venture Information:</strong> Working titles, problem statements, customer definitions, stage, traction evidence, monetization models, and supplementary uploaded documents (pitch decks, architecture diagrams).</li>
              <li><strong>Authentication Data:</strong> OAuth identity tokens provided via Google Sign-In (Firebase Authentication).</li>
              <li><strong>Communications &amp; Inquiries:</strong> Messages sent via the workspace messaging module or general contact forms.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>2. How We Use Collected Data</h3>
            <p>We process your information strictly for legitimate venture studio operations:</p>
            <ul style={{ paddingLeft: '20px', color: 'var(--ink-2)' }}>
              <li>Evaluating founder applications and assessing product-problem fit.</li>
              <li>Enabling AI-assisted preparation reviews requested by the founder.</li>
              <li>Managing communication, feedback requests, and interview scheduling.</li>
              <li>Maintaining an internal audit history of application milestones.</li>
              <li>Ensuring security, detecting abuse, and complying with statutory obligations.</li>
            </ul>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>3. Data Security &amp; Storage</h3>
            <p>
              Ideacubator leverages Google Cloud and Firebase infrastructure. All data in transit is encrypted using modern TLS (Transport Layer Security 1.3), and all Firestore documents and Storage assets are encrypted at rest using AES-256. Access to submitted documents is strictly enforced via server-side Security Rules tied to your authenticated Firebase UID.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>4. No Sale of Personal Data</h3>
            <p>
              Ideacubator <strong>never sells, rents, leases, or trades</strong> personal information or proprietary founder submissions to third-party data brokers, marketers, or advertisers.
            </p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>5. Founder Rights &amp; Deletion</h3>
            <p>
              Under applicable data protection laws (including the Digital Personal Data Protection Act, 2023 of India), you have the right to request access to your stored records, request correction of inaccurate details, or request full deletion of your application and workspace account. Contact <a href="mailto:team@ideacubator.in" style={{ color: 'var(--brown)', textDecoration: 'underline' }}>team@ideacubator.in</a> to exercise these rights.
            </p>
          </section>

          <section>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>6. Contact Privacy Office</h3>
            <div className="note" style={{ marginTop: '10px' }}>
              <strong>Data Protection &amp; Privacy Officer</strong><br />
              Ideacubator, Bangalore, Karnataka, India<br />
              Email: <a href="mailto:team@ideacubator.in" style={{ color: 'var(--brown)', textDecoration: 'underline' }}>team@ideacubator.in</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
