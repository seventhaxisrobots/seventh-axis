// Company details used across the site and the legal pages.
// Replace the placeholders before a public launch.

export const SITE = {
  name: "Seventh Axis",
  // TODO: replace with a monitored inbox (the .example domain can't receive mail).
  contactEmail: "hello@seventhaxis.example",
  // TODO: fill in once the company is registered with SSM.
  legalEntity: "Seventh Axis (company registration pending)",
  city: "Kuala Lumpur, Malaysia",
  // Optional: a Cal.com or Calendly link for instant scheduling on /book.
  bookingUrl: import.meta.env.VITE_BOOKING_URL as string | undefined,
  // Set VITE_ANALYTICS=vercel to load Vercel Web Analytics after consent.
  analytics: import.meta.env.VITE_ANALYTICS as string | undefined,
};
