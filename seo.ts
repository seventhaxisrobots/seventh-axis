// Search and sharing metadata for every page, applied at build time by the
// seo() plugin in vite.config.ts: canonical URLs, absolute share tags,
// structured data and the sitemap all come from here.

import { FAQ, FOUNDER, PRICING } from "./src/shared/knowledge.ts";

export const SITE_URL = (process.env.SITE_URL ?? "https://seventh-axis.vercel.app").replace(/\/$/, "");
export const SITE_NAME = "Seventh Axis";

export interface PageSeo {
  path: string;
  /** Leave out of the sitemap and ask search engines not to index it. */
  noindex?: boolean;
  priority?: number;
  image?: string;
  jsonLd?: Record<string, unknown>[];
}

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/apple-touch-icon.png`,
  slogan: "The missing axis is understanding.",
  description: "Seventh Axis makes software that lets factory staff program robot arms in plain English, Bahasa Malaysia or Chinese, with every move checked in simulation first.",
  address: { "@type": "PostalAddress", addressLocality: "Kuala Lumpur", addressCountry: "MY" },
  areaServed: { "@type": "Country", name: "Malaysia" },
  knowsLanguage: ["en", "ms", "zh"],
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: "en-MY",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const software = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Seventh Axis Studio",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  url: `${SITE_URL}/studio`,
  description:
    "Describe a robot task in English, Bahasa Malaysia or Chinese. The Studio plans it, checks reach and collisions in a digital twin, and exports URScript for the arm.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR", description: "Free live demo" },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

// The FAQ shown on /product; the markup must match the visible content.
export const faqPage = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
};

const calculator = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Robot ROI calculator for Malaysian factories",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  url: `${SITE_URL}/roi`,
  description:
    "Work out how fast a robot cell pays for itself using Malaysian minimum wage, employer EPF and SOCSO, the foreign worker levy and the Smart Automation Grant.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "MYR" },
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const pricing = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Seventh Axis",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web browser",
  url: `${SITE_URL}/pricing`,
  offers: PRICING.filter((p) => p.price.startsWith("RM")).map((p) => ({
    "@type": "Offer",
    name: p.name,
    price: p.price.replace(/[^0-9.]/g, ""),
    priceCurrency: "MYR",
    description: `${p.cadence}. ${p.summary}`,
  })),
  publisher: { "@id": `${SITE_URL}/#organization` },
};

const about = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}/about`,
  mainEntity: { "@id": `${SITE_URL}/#organization` },
  about: {
    "@type": "Person",
    name: FOUNDER.name,
    jobTitle: FOUNDER.role,
    image: `${SITE_URL}${FOUNDER.image}`,
    sameAs: [FOUNDER.linkedin, FOUNDER.github],
    alumniOf: { "@type": "CollegeOrUniversity", name: FOUNDER.school },
    worksFor: { "@id": `${SITE_URL}/#organization` },
  },
};

const crumbs = (name: string, path: string) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
    { "@type": "ListItem", position: 2, name, item: `${SITE_URL}${path}` },
  ],
});

export const PAGE_SEO: Record<string, PageSeo> = {
  index: { path: "/", priority: 1, jsonLd: [organization, website] },
  product: { path: "/product", image: "/og/product.jpg", priority: 0.9, jsonLd: [software, faqPage, crumbs("Product", "/product")] },
  pricing: { path: "/pricing", image: "/og/pricing.jpg", priority: 0.9, jsonLd: [pricing, crumbs("Pricing", "/pricing")] },
  industries: { path: "/industries", image: "/og/industries.jpg", priority: 0.8, jsonLd: [crumbs("Industries", "/industries")] },
  roi: { path: "/roi", image: "/og/roi.jpg", priority: 0.9, jsonLd: [calculator, crumbs("ROI calculator", "/roi")] },
  pilot: { path: "/pilot", image: "/og/pilot.jpg", priority: 0.8, jsonLd: [crumbs("Pilot programme", "/pilot")] },
  studio: { path: "/studio", image: "/og/studio.jpg", priority: 0.9, jsonLd: [software, crumbs("Studio", "/studio")] },
  about: { path: "/about", image: "/og/about.jpg", priority: 0.8, jsonLd: [about, crumbs("About and investors", "/about")] },
  safety: { path: "/safety", image: "/og/safety.jpg", priority: 0.6, jsonLd: [crumbs("Safety", "/safety")] },
  book: { path: "/book", image: "/og/book.jpg", priority: 0.7, jsonLd: [crumbs("Book a meeting", "/book")] },
  privacy: { path: "/privacy", priority: 0.2 },
  cookies: { path: "/cookies", priority: 0.2 },
  terms: { path: "/terms", priority: 0.2 },
  "404": { path: "/404", noindex: true },
  app: { path: "/app", noindex: true },
};
