import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { type } = data;

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Email service not configured on server (missing RESEND_API_KEY)' },
        { status: 500 }
      );
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Ideacubator <onboarding@resend.dev>';
    const fallbackTo = process.env.RESEND_FALLBACK_TO || 'amoginfotech@gmail.com';

    let subject = '';
    let htmlContent = '';
    let targetEmail = '';
    const replyTo = data.email || undefined;

    if (type === 'invest') {
      const {
        name,
        email,
        firm,
        investorType,
        ticketSize,
        geography,
        focusSectors,
        linkedin,
        notes
      } = data;

      targetEmail = process.env.INVESTOR_LEAD_TO || 'invest@ideacubator.in';
      subject = `💼 New Investor Lead: ${name} ${firm ? `(${firm})` : ''} — ${ticketSize || 'Investment'}`;

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e6ded6; border-radius: 12px; background-color: #fcfbf9;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #a84d28; padding-bottom: 12px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; color: #a84d28;">Ideacubator Investor Relations</span>
            <h2 style="margin: 6px 0 0; color: #1e1b18; font-size: 22px;">New Investor Registration</h2>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; width: 140px; font-weight: 600;">Investor Name:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px; font-weight: 700;">${name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #a84d28; font-size: 14px;"><a href="mailto:${email}" style="color: #a84d28; text-decoration: underline;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Firm / Syndicate:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px;">${firm || 'Independent / Individual'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Investor Type:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px;">${investorType || 'Unspecified'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Typical Check Size:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px; font-weight: 700;">${ticketSize || 'Unspecified'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Target Geography:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px;">${geography || 'Global'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Focus Sectors:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px;">${focusSectors || 'All / Generalist'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">LinkedIn / Profile:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px;">${linkedin ? `<a href="${linkedin}" target="_blank" style="color: #a84d28;">${linkedin}</a>` : 'Not provided'}</td>
            </tr>
          </table>

          <div style="margin-top: 16px; padding: 14px; background: #f3efe9; border-radius: 8px; border: 1px solid #e2dad1;">
            <div style="font-size: 12px; font-weight: 700; color: #6b635b; text-transform: uppercase; margin-bottom: 6px;">Mandate Notes / Preferences:</div>
            <div style="font-size: 14px; color: #2e2823; line-height: 1.6; white-space: pre-wrap;">${notes || 'No extra notes provided.'}</div>
          </div>

          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e6ded6; font-size: 12px; color: #8c8278; text-align: center;">
            Sent automatically via Ideacubator Investor Portal · Reply directly to this email to contact the investor.
          </div>
        </div>
      `;
    } else {
      // Default: Contact Inquiry
      const { name, email, subject: inquirySubject, message } = data;

      targetEmail = process.env.CONTACT_INQUIRY_TO || 'contactus@ideacubator.in';
      subject = `📬 New Contact Inquiry: [${inquirySubject || 'General'}] from ${name}`;

      htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e6ded6; border-radius: 12px; background-color: #fcfbf9;">
          <div style="margin-bottom: 20px; border-bottom: 2px solid #a84d28; padding-bottom: 12px;">
            <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; color: #a84d28;">Ideacubator Inquiries</span>
            <h2 style="margin: 6px 0 0; color: #1e1b18; font-size: 22px;">New Contact Form Message</h2>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; width: 120px; font-weight: 600;">Sender:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px; font-weight: 700;">${name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Email:</td>
              <td style="padding: 8px 0; color: #a84d28; font-size: 14px;"><a href="mailto:${email}" style="color: #a84d28; text-decoration: underline;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b635b; font-size: 13px; font-weight: 600;">Topic / Subject:</td>
              <td style="padding: 8px 0; color: #1e1b18; font-size: 14px; font-weight: 600;">${inquirySubject || 'General'}</td>
            </tr>
          </table>

          <div style="margin-top: 16px; padding: 16px; background: #f3efe9; border-radius: 8px; border: 1px solid #e2dad1;">
            <div style="font-size: 12px; font-weight: 700; color: #6b635b; text-transform: uppercase; margin-bottom: 6px;">Message:</div>
            <div style="font-size: 14px; color: #2e2823; line-height: 1.65; white-space: pre-wrap;">${message || 'No message provided.'}</div>
          </div>

          <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #e6ded6; font-size: 12px; color: #8c8278; text-align: center;">
            Sent automatically via Ideacubator Contact Form · Hit Reply to respond directly to ${name}.
          </div>
        </div>
      `;
    }

    // Helper to send email via Resend REST API (Native fetch, zero npm libraries)
    const sendViaResend = async (recipient: string) => {
      return await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          reply_to: replyTo,
          subject,
          html: htmlContent
        })
      });
    };

    // First attempt to send to the intended target email (e.g. contactus@ideacubator.in / invest@ideacubator.in)
    let resendResponse = await sendViaResend(targetEmail);
    let resendData = await resendResponse.json();

    // If Resend rejects because domain is in testing/sandbox mode without verified DNS:
    if (!resendResponse.ok && resendData?.name === 'validation_error' && fallbackTo && fallbackTo !== targetEmail) {
      console.warn(
        `[Resend Delivery] Target ${targetEmail} not allowed in sandbox mode. Retrying to verified account email ${fallbackTo}...`
      );
      resendResponse = await sendViaResend(fallbackTo);
      resendData = await resendResponse.json();
    }

    if (!resendResponse.ok) {
      console.error('[Resend Error]', resendData);
      return NextResponse.json(
        { error: resendData.message || 'Failed to dispatch email' },
        { status: resendResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      id: resendData.id,
      message: 'Email delivered successfully'
    });
  } catch (error: any) {
    console.error('[API Send Inquiry Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
