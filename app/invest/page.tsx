'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function InvestPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    firm: '',
    investorType: '',
    ticketSize: '',
    geography: '',
    focusSectors: '',
    linkedin: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/send-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'invest',
          name: formData.name.trim(),
          email: formData.email.trim(),
          firm: formData.firm.trim(),
          investorType: formData.investorType,
          ticketSize: formData.ticketSize,
          geography: formData.geography,
          focusSectors: formData.focusSectors,
          linkedin: formData.linkedin.trim(),
          notes: formData.notes.trim()
        })
      });

      let result: any = null;
      try {
        result = await res.json();
      } catch {
        // Handled below if !res.ok
      }

      if (!res.ok) {
        throw new Error(result?.error || `Server responded with status ${res.status}. Please email invest@ideacubator.in directly.`);
      }

      setSubmitted(true);
    } catch (err: any) {
      console.error('[Invest Submit Error]', err);
      setErrorMsg(err.message || 'There was an issue registering your profile. Please email invest@ideacubator.in directly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">Investor Relations</div>
            <h1 className="title">Invest in verified ventures.</h1>
            <p className="subtitle">
              Ideacubator works with qualified angels, family offices, and institutional venture funds seeking
              rigorously validated, engineering-backed startups with strong unit economics.
            </p>
          </div>
        </div>

        <div className="shell-2col">
          {/* ── INVESTOR PROCESS & PHILOSOPHY ── */}
          <div>
            <div className="card pad" style={{ marginBottom: '20px' }}>
              <div className="eyebrow">Our Co-Investment Approach</div>
              <h3 style={{ fontSize: '22px', margin: '10px 0 14px' }}>How opportunities are introduced</h3>

              <div style={{ display: 'grid', gap: '16px', fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: 'var(--ink)' }}>1. Direct Building:</strong> Unlike traditional demo-day incubators, Ideacubator actively co-builds product architectures, AI backends, and go-to-market motions with founders before introductions.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: 'var(--ink)' }}>2. Factual Due Diligence:</strong> We maintain complete data rooms with verifiable technical architectures, audited customer pilots, and transparent unit metrics.
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: 'var(--ink)' }}>3. Independent Decision Making:</strong> Investors conduct independent diligence and negotiate directly with founders. We do not make return guarantees or speculative forecasts.
                </p>
              </div>
            </div>

            <div className="card pad" style={{ background: 'var(--paper-2)' }}>
              <div className="eyebrow">Sector Focus</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                <span className="badge">B2B Software</span>
                <span className="badge">Applied AI / Automation</span>
                <span className="badge">Fintech &amp; Payments</span>
                <span className="badge">Healthcare &amp; Diagnostics</span>
                <span className="badge">Cross-Border Platforms</span>
              </div>
            </div>

            <div className="note" style={{ marginTop: '16px' }}>
              <strong>Direct Investor Inquiries:</strong><br />
              Institutional mandates, LP inquiries &amp; co-investment:<br />
              <a href="mailto:invest@ideacubator.in" style={{ color: 'var(--brown)', fontWeight: 700, textDecoration: 'underline' }}>
                invest@ideacubator.in
              </a>
            </div>
          </div>

          {/* ── INVESTOR INTEREST FORM ── */}
          <div className="card pad">
            <div className="eyebrow">Investor Profile Registration</div>
            <h3 style={{ fontSize: '24px', margin: '8px 0 6px' }}>Register your investment criteria</h3>
            <p style={{ fontSize: '13px', color: 'var(--ink-2)', marginBottom: '20px' }}>
              Share your sector focus, stage preference, and typical check size so we can introduce relevant venture conversations.
            </p>

            {!submitted ? (
              <form onSubmit={handleSubmit}>
                <div className="grid">
                  <div className="field">
                    <label className="label">Your Name <span className="required">*</span></label>
                    <input
                      name="name"
                      required
                      placeholder="Full name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Work Email <span className="required">*</span></label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@fund.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Firm / Family Office / Entity</label>
                    <input
                      name="firm"
                      placeholder="e.g. Apex Ventures, Angel Syndicate"
                      value={formData.firm}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field">
                    <label className="label">Investor Type <span className="required">*</span></label>
                    <select
                      name="investorType"
                      required
                      value={formData.investorType}
                      onChange={handleChange}
                    >
                      <option value="">Select category...</option>
                      <option value="angel">Accredited Angel Investor</option>
                      <option value="vc">Venture Capital Fund</option>
                      <option value="family_office">Single/Multi Family Office</option>
                      <option value="corporate">Corporate Venture Capital</option>
                      <option value="syndicate">Syndicate Lead</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Typical Check Size</label>
                    <select
                      name="ticketSize"
                      value={formData.ticketSize}
                      onChange={handleChange}
                    >
                      <option value="">Select range...</option>
                      <option value="10k-50k">$10,000 – $50,000 (₹10L – ₹50L)</option>
                      <option value="50k-250k">$50,000 – $250,000 (₹50L – ₹2Cr)</option>
                      <option value="250k-1m">$250,000 – $1,000,000 (₹2Cr – ₹8Cr)</option>
                      <option value="1m-plus">$1,000,000+ (₹8Cr+)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label className="label">Preferred Geography</label>
                    <input
                      name="geography"
                      placeholder="India, US, Southeast Asia, Global"
                      value={formData.geography}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field full">
                    <label className="label">Sectors &amp; Themes of Interest</label>
                    <input
                      name="focusSectors"
                      placeholder="e.g. Generative AI, Developer Tools, Enterprise Fintech"
                      value={formData.focusSectors}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field full">
                    <label className="label">LinkedIn / Website URL</label>
                    <input
                      name="linkedin"
                      type="url"
                      placeholder="https://..."
                      value={formData.linkedin}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field full">
                    <label className="label">Additional Notes or Mandate Specifics</label>
                    <textarea
                      name="notes"
                      placeholder="Tell us about specific co-investment preferences, lead vs follow mandates, or domain expertise you bring."
                      style={{ minHeight: '90px' }}
                      value={formData.notes}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '8px', background: 'var(--red-soft, #fde8e8)', border: '1px solid var(--red, #e02424)', color: 'var(--red, #9b1c1c)', fontSize: '13px' }}>
                    ⚠️ {errorMsg}
                  </div>
                )}

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    className="primary"
                    disabled={submitting}
                    style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                  >
                    {submitting ? 'Registering Criteria...' : 'Submit Investor Profile →'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div className="success-icon" style={{ margin: '0 auto 16px', background: 'var(--green-soft)', color: 'var(--green)', width: '60px', height: '60px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '26px' }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '22px', margin: '0 0 10px' }}>Investor Profile Received</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Thank you for sharing your criteria. Our investment evaluation team will review your mandate and contact you when high-conviction, relevant venture opportunities are ready for discussion.
                </p>
                <Link className="secondary" href="/" style={{ padding: '12px 24px', fontSize: '13px' }}>
                  Return to Ideacubator
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
