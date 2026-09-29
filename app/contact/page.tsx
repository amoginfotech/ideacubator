'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <main className="page">
      <div className="container">
        <div className="page-head">
          <div>
            <div className="eyebrow">Get in Touch</div>
            <h1 className="title">Start a conversation.</h1>
            <p className="subtitle">
              Have questions about our venture building model, partnership opportunities, or technical collaboration? Reach out directly.
            </p>
          </div>
        </div>

        <div className="shell-2col">
          {/* ── CONTACT INFO ── */}
          <div>
            <div className="card pad" style={{ marginBottom: '20px' }}>
              <div className="eyebrow">Studio Location</div>
              <h3 style={{ fontSize: '22px', margin: '10px 0 14px' }}>Bangalore, India</h3>
              <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, margin: '0 0 16px' }}>
                Ideacubator operates from the technology epicenter of Bangalore, with global engagement spanning North America, Europe, and Southeast Asia.
              </p>

              <div className="divider" style={{ borderTop: '1px solid var(--line)', margin: '20px 0' }} />

              <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.8 }}>
                <div><strong>Inquiries:</strong> contactus@ideacubator.in</div>
                <div><strong>Operating Hours:</strong> Monday – Friday, 9:30 AM – 7:00 PM IST</div>
              </div>
            </div>

            <div className="card pad" style={{ background: 'var(--paper-2)' }}>
              <div className="eyebrow">Founder Submissions</div>
              <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, margin: '10px 0 16px' }}>
                Looking to submit a startup concept or product for evaluation? We strongly recommend using our dedicated founder application.
              </p>
              <Link className="primary" href="/submit-idea" style={{ fontSize: '12px', padding: '10px 18px', display: 'inline-flex' }}>
                Go to Founder Application →
              </Link>
            </div>
          </div>

          {/* ── CONTACT FORM ── */}
          <div className="card pad">
            <div className="eyebrow">Message Us</div>
            <h3 style={{ fontSize: '24px', margin: '8px 0 16px' }}>Send our team a message</h3>

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
                    <label className="label">Email Address <span className="required">*</span></label>
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="you@domain.com"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="field full">
                    <label className="label">Subject <span className="required">*</span></label>
                    <select
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                    >
                      <option value="">Select inquiry topic...</option>
                      <option value="general">General Inquiry</option>
                      <option value="partnership">Strategic Partnership</option>
                      <option value="media">Media &amp; Speaking</option>
                      <option value="cross_border">Cross-Border Business Expansion</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="field full">
                    <label className="label">Your Message <span className="required">*</span></label>
                    <textarea
                      name="message"
                      required
                      placeholder="How can our team help?"
                      style={{ minHeight: '140px' }}
                      value={formData.message}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px' }}>
                  <button
                    type="submit"
                    className="primary"
                    disabled={submitting}
                    style={{ width: '100%', padding: '14px', fontSize: '14px' }}
                  >
                    {submitting ? 'Sending Message...' : 'Send Message →'}
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div className="success-icon" style={{ margin: '0 auto 16px', background: 'var(--green-soft)', color: 'var(--green)', width: '60px', height: '60px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '26px' }}>
                  ✓
                </div>
                <h3 style={{ fontSize: '22px', margin: '0 0 10px' }}>Message Delivered</h3>
                <p style={{ color: 'var(--ink-2)', fontSize: '14px', maxWidth: '460px', margin: '0 auto 24px', lineHeight: 1.6 }}>
                  Thank you for contacting Ideacubator. Our team will review your message and reply via email within one business day.
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
