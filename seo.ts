// Search and sharing metadata for every page, applied at build time by the
// seo() plugin in vite.config.ts: canonical URLs, absolute share tags,
// structured data and the sitemap all come from here.

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

export const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I program a robot arm in Bahasa Malaysia?",
    a: "Yes. Seventh Axis understands English, Bahasa Malaysia, Chinese and Manglish, typed or spoken, and turns the instruction into a robot program you can check in simulation before it runs.",
  },
  {
    q: "How much does a robot cell cost in Malaysia?",
    a: "A collaborative palletising or machine-tending cell with arm, gripper, guarding and installation typically costs RM120,000 to RM250,000. The Smart Automation Grant can match part of eligible costs, and our ROI calculator shows the payback with Malaysian wages and levies.",
  },
  {
    q: "Does the Smart Automation Grant cover robots?",
    a: "The Smart Automation Grant is a matching grant for Malaysian manufacturers and service companies that automate. Robot cells and their integration are typical eligible costs; coverage depends on approval.",
  },
  {
    q: "Does Seventh Axis sell robots?",
    a: "No. Seventh Axis is software. You buy the robot arm from your usual supplier or integrator, and Seventh Axis lets your team program it in plain language, with every move checked in simulation first.",
  },
  {
    q: "Which robot arms does Seventh Axis work with?",
    a: "Programs export as URScript for Universal Robots arms today. More controllers are on the roadmap, and the planner itself is independent of the arm brand.",
  },
  {
    q: "Is it safe to let an AI program a robot?",
    a: "The AI only decides what moves where. Every move is checked for reach, collisions, payload and fragile items in a digital twin, speeds are capped, and nothing runs until an operator approves the program.",
  },
  {
    q: "Do we need a robot programmer on staff?",
    a: "No. Line staff describe the task in their own words. An engineer reviews and approves the simulated program, then loads it on the teach pendant.",
  },
];

// Ready for when the FAQ is shown on the product page (the markup must match visible content).
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
  product: { path: "/product", priority: 0.9, jsonLd: [software, crumbs("Product", "/product")] },
  industries: { path: "/industries", priority: 0.8, jsonLd: [crumbs("Industries", "/industries")] },
  roi: { path: "/roi", priority: 0.9, jsonLd: [calculator, crumbs("ROI calculator", "/roi")] },
  pilot: { path: "/pilot", priority: 0.8, jsonLd: [crumbs("Pilot programme", "/pilot")] },
  studio: { path: "/studio", priority: 0.9, jsonLd: [software, crumbs("Studio", "/studio")] },
  book: { path: "/book", priority: 0.7, jsonLd: [crumbs("Book a meeting", "/book")] },
  privacy: { path: "/privacy", priority: 0.2 },
  cookies: { path: "/cookies", priority: 0.2 },
  terms: { path: "/terms", priority: 0.2 },
  "404": { path: "/404", noindex: true },
};
