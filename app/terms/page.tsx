import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Engagement — Ideacubator',
  description: 'Terms of Engagement governing your access, website use, and venture applications to Ideacubator.'
};

export default function TermsPage() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: '900px' }}>
        <div className="page-head">
          <div>
            <div className="eyebrow">Legal &amp; Governance</div>
            <h1 className="title">Terms of Engagement</h1>
            <p className="subtitle">Effective Date: April 1, 2026 · Governed by the Laws of India</p>
          </div>
        </div>

        <div className="card pad" style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.7 }}>
          <div className="note" style={{ marginBottom: '24px' }}>
            <strong>Notice:</strong> These Terms of Engagement govern your access to the Ideacubator website, submission of venture or founder applications, and preliminary interactions with Ideacubator. Please read them carefully.
          </div>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>1. Introduction</h3>
            <p>Welcome to Ideacubator (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;, or &quot;Ideacubator&quot;), accessible via ideacubator.in. By accessing our website, browsing our content, or submitting an application through our platform, you (&quot;Applicant&quot;, &quot;Founder&quot;, or &quot;User&quot;) acknowledge that you have read, understood, and agreed to be bound by these Terms of Engagement (&quot;Terms&quot;). If you do not agree with any part of these Terms, you must refrain from using the platform and submitting information.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>2. About Ideacubator</h3>
            <p>Ideacubator operates as a venture studio and company builder based in Bangalore, India. We partner with founders through hands-on product strategy, software engineering, AI systems development, and go-to-market execution. Crucially, Ideacubator operates dual activities: (i) reviewing and potentially partnering with founders who submit their ventures to us, and (ii) independently originating, incubating, building, and funding ventures through our internal studio team.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>3. Eligibility</h3>
            <p>You must be at least 18 years of age and possess full legal capacity to enter into binding legal agreements under the Indian Contract Act, 1872, or the laws of your jurisdiction. If you submit an application on behalf of a company, startup, or partnership, you represent and warrant that you hold full corporate authority to bind that entity to these Terms.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>4. Application Process &amp; Non-Commitment</h3>
            <p>Our online application form is an intake mechanism designed to collect preliminary details regarding your idea, MVP, startup, or business requirement. Submitting an application initiates an initial evaluation process only. It does not commit Ideacubator to interview, review, incubate, partner with, or finance your venture.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>5. Intellectual Property Framework</h3>
            <p>We respect the intellectual property of entrepreneurs. Submitting an application to Ideacubator <strong>does not transfer or assign ownership of your pre-existing intellectual property</strong> to Ideacubator. You retain all right, title, and interest in your pre-existing IP.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>6. Independently Developed Concepts</h3>
            <p>As an active venture studio and technology builder, Ideacubator, its affiliates, advisors, and portfolio companies continuously evaluate, brainstorm, and build businesses across diverse technology sectors (including AI, SaaS, FinTech, and B2B workflows). You acknowledge and agree that receipt of your submission shall not limit or restrict Ideacubator&apos;s right to independently develop, produce, partner with, or invest in products, services, or companies in similar market verticals, provided express confidentiality obligations are respected.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>7. No Guarantee of Funding or Acceptance</h3>
            <p>Ideacubator makes <strong>no guarantee, representation, or promise</strong> that any applicant will receive funding, investment capital, syndication, grants, or co-investment through our platform. All venture partnership decisions are made at the sole discretion of our evaluation committee.</p>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>8. Governing Law &amp; Jurisdiction</h3>
            <p>These Terms, your application, and all related interactions shall be governed by and construed in accordance with the substantive laws of <strong>India</strong>. Any dispute, controversy, or claim arising out of or relating to these Terms shall be subject to the exclusive jurisdiction of the competent courts situated in <strong>Bangalore (Bengaluru), Karnataka, India</strong>.</p>
          </section>

          <section>
            <h3 style={{ fontSize: '20px', color: 'var(--brown)', marginBottom: '8px' }}>9. Contact Information</h3>
            <p>For questions or formal inquiries regarding these Terms of Engagement, please contact us at:</p>
            <div className="note" style={{ marginTop: '10px' }}>
              <strong>Ideacubator Legal &amp; Governance</strong><br />
              Bangalore, Karnataka, India<br />
              Email: <a href="mailto:team@ideacubator.in" style={{ color: 'var(--brown)', textDecoration: 'underline' }}>team@ideacubator.in</a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
