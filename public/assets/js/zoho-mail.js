/**
 * Ideacubator Communications & Calendar Integration Engine (assets/js/zoho-mail.js)
 * Manages transactional notifications, calendar invite (.ics) generation,
 * Google Calendar 1-click links, and mail queueing for Zoho Business Mail.
 */
(function () {
  'use strict';

  const ZohoComms = {
    // 1. Generate RFC 5545 compliant .ics calendar invite payload
    generateIcsContent(meeting) {
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const startDate = meeting.startDate instanceof Date ? meeting.startDate : new Date(meeting.startDate || Date.now());
      const endDate = new Date(startDate.getTime() + (meeting.durationMinutes || 30) * 60 * 1000);

      const formatIcsDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtStart = formatIcsDate(startDate);
      const dtEnd = formatIcsDate(endDate);
      const uid = `meeting-${meeting.id || Date.now()}@ideacubator.in`;

      return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Ideacubator//Venture Portal//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${meeting.title || 'Ideacubator Partner Discovery Session'}`,
        `DESCRIPTION:${(meeting.description || 'Diligence and feasibility review session with the Ideacubator venture team.').replace(/\n/g, '\\n')}\\n\\nVideo Room: ${meeting.videoCallUrl || 'https://meet.google.com/ideacubator'}`,
        `LOCATION:${meeting.videoCallUrl || 'Google Meet'}`,
        'STATUS:CONFIRMED',
        'ORGANIZER;CN=Ideacubator Venture Studio:mailto:team@ideacubator.in',
        `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${meeting.founderName || 'Founder'}:mailto:${meeting.founderEmail || 'team@ideacubator.in'}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
    },

    // 2. Download .ics file directly to founder/admin device
    downloadIcsFile(meeting) {
      const content = this.generateIcsContent(meeting);
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Ideacubator-Meeting-${(meeting.title || 'Session').replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    },

    // 3. Generate 1-click Google Calendar add link
    getGoogleCalendarUrl(meeting) {
      const startDate = meeting.startDate instanceof Date ? meeting.startDate : new Date(meeting.startDate || Date.now());
      const endDate = new Date(startDate.getTime() + (meeting.durationMinutes || 30) * 60 * 1000);
      const formatGCalDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const title = encodeURIComponent(meeting.title || 'Ideacubator Partner Discovery Session');
      const details = encodeURIComponent(`${meeting.description || 'Diligence and technical review with Ideacubator.'}\n\nVideo Room: ${meeting.videoCallUrl || 'https://meet.google.com/ideacubator'}`);
      const location = encodeURIComponent(meeting.videoCallUrl || 'Google Meet');
      const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`;

      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
    },

    // 4. Queue notification in Firestore for Zoho SMTP Worker / Audit
    async queueEmailNotification(payload) {
      if (!window.IC_FIREBASE || !window.IC_FIREBASE.db) return;
      try {
        await window.IC_FIREBASE.db.collection('mail_queue').add({
          to: payload.to,
          from: 'team@ideacubator.in',
          subject: payload.subject,
          bodyHtml: payload.bodyHtml,
          category: payload.category || 'general',
          metadata: payload.metadata || {},
          status: 'queued',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.warn('Mail queue audit notice:', err);
      }
    }
  };

  window.IC_COMMS = ZohoComms;
})();
