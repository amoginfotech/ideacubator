/**
 * Ideacubator Communications & Calendar Helper
 */

export interface MeetingDetails {
  id?: string;
  title: string;
  description?: string;
  videoCallUrl?: string;
  startDate: Date | string;
  durationMinutes?: number;
  founderName?: string;
  founderEmail?: string;
}

export function generateIcsContent(meeting: MeetingDetails): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const start = meeting.startDate instanceof Date ? meeting.startDate : new Date(meeting.startDate || Date.now());
  const end = new Date(start.getTime() + (meeting.durationMinutes || 30) * 60 * 1000);

  const formatIcs = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
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
    `DTSTART:${formatIcs(start)}`,
    `DTEND:${formatIcs(end)}`,
    `SUMMARY:${meeting.title || 'Ideacubator Partner Discovery Session'}`,
    `DESCRIPTION:${(meeting.description || 'Diligence and technical review session with Ideacubator.').replace(/\n/g, '\\n')}\\n\\nVideo Room: ${meeting.videoCallUrl || 'https://meet.google.com/ideacubator'}`,
    `LOCATION:${meeting.videoCallUrl || 'Google Meet'}`,
    'STATUS:CONFIRMED',
    'ORGANIZER;CN=Ideacubator Venture Studio:mailto:team@ideacubator.in',
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN=${meeting.founderName || 'Founder'}:mailto:${meeting.founderEmail || 'team@ideacubator.in'}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadIcsFile(meeting: MeetingDetails): void {
  if (typeof window === 'undefined') return;
  const content = generateIcsContent(meeting);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Ideacubator-Meeting-${(meeting.title || 'Session').replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function getGoogleCalendarUrl(meeting: MeetingDetails): string {
  const start = meeting.startDate instanceof Date ? meeting.startDate : new Date(meeting.startDate || Date.now());
  const end = new Date(start.getTime() + (meeting.durationMinutes || 30) * 60 * 1000);
  const formatGCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const title = encodeURIComponent(meeting.title || 'Ideacubator Partner Discovery Session');
  const details = encodeURIComponent(`${meeting.description || 'Diligence and technical review with Ideacubator.'}\n\nVideo Room: ${meeting.videoCallUrl || 'https://meet.google.com/ideacubator'}`);
  const location = encodeURIComponent(meeting.videoCallUrl || 'Google Meet');
  const dates = `${formatGCal(start)}/${formatGCal(end)}`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
}
