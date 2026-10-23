// Meeting options shared by the booking page and the booking API.
// Times are Malaysia time (UTC+8, no daylight saving).

export const MEETING_TYPES = {
  intro: { label: "Intro call", minutes: 30, where: "Google Meet or phone" },
  demo: { label: "Studio walkthrough", minutes: 45, where: "Online, screen share" },
  visit: { label: "Line visit", minutes: 90, where: "At your factory in the Klang Valley, Penang or Johor" },
  heimdall: { label: "Heimdall briefing (agencies)", minutes: 60, where: "At your office in the Klang Valley, or secure video" },
} as const;

export type MeetingType = keyof typeof MEETING_TYPES;

export const TIME_SLOTS = ["10:00", "11:30", "14:30", "16:00"] as const;

export const BOOKING_WINDOW_DAYS = 60;

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Today's date in Malaysia as YYYY-MM-DD. */
export function mytToday(now = Date.now()): string {
  return new Date(now + MYT_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isWeekday(date: string): boolean {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

/** The next `count` weekdays, starting tomorrow (Malaysia time). */
export function upcomingWeekdays(count: number, now = Date.now()): string[] {
  const out: string[] = [];
  let date = mytToday(now);
  while (out.length < count) {
    date = addDays(date, 1);
    if (isWeekday(date)) out.push(date);
  }
  return out;
}

export function isBookableDate(date: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return false;
  const today = mytToday(now);
  return date > today && date <= addDays(today, BOOKING_WINDOW_DAYS) && isWeekday(date);
}

/** UTC instant for a Malaysia-time date and HH:MM slot. */
export function slotStartUtc(date: string, time: string): Date {
  return new Date(Date.parse(`${date}T${time}:00Z`) - MYT_OFFSET_MS);
}
