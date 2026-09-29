import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      meetingId,
      founderName,
      founderEmail,
      founderPhone,
      applicationTitle,
      date,
      timeSlot,
      agenda
    } = data;

    // Log the notification for studio admin mailbox
    console.log('[Ideacubator Mailbox] New Meeting Scheduled:');
    console.log(`- To: team@ideacubator.in, submitidea@ideacubator.in`);
    console.log(`- Founder: ${founderName} (${founderEmail})`);
    console.log(`- Phone: ${founderPhone || 'N/A'}`);
    console.log(`- Venture: ${applicationTitle}`);
    console.log(`- Scheduled: ${date} at ${timeSlot}`);
    console.log(`- Agenda: ${agenda || 'Strategy review & diligence session'}`);

    // If an external email service (Resend, SendGrid, etc.) is configured in environment:
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'Ideacubator Scheduler <noreply@ideacubator.in>',
            to: ['team@ideacubator.in', 'submitidea@ideacubator.in'],
            subject: `📅 New Strategy Session Scheduled: ${applicationTitle} (${founderName})`,
            html: `
              <h2>New Founder Diligence Session Scheduled</h2>
              <p><strong>Venture:</strong> ${applicationTitle}</p>
              <p><strong>Founder:</strong> ${founderName} (${founderEmail})</p>
              <p><strong>Phone:</strong> ${founderPhone || 'Not provided'}</p>
              <p><strong>Date & Time:</strong> ${date} at ${timeSlot}</p>
              <p><strong>Agenda:</strong> ${agenda || 'General diligence review'}</p>
              <p><em>Access your admin console at /admin to manage this session.</em></p>
            `
          })
        });
      } catch (mailErr) {
        console.warn('[Ideacubator Mailbox] Mail delivery fallback:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Meeting notification registered for Ideacubator mailbox (team@ideacubator.in)',
      recipient: 'team@ideacubator.in',
      meetingId
    });
  } catch (err: any) {
    console.error('[Ideacubator Mailbox] Error processing notification:', err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
