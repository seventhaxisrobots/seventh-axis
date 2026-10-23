// What Seventh Axis is, in one place: the FAQ on /product, the search
// metadata, the pricing page and the Ask Axis assistant all read from here.
// Prices are placeholders to confirm before launch.

export const FOUNDER = {
  name: "Zishaan Ahmed",
  role: "Founder",
  image: "/img/founder-full-1920.webp",
  linkedin: "https://www.linkedin.com/in/zishaan-ahmed",
  github: "https://github.com/zishaan1911",
  school: "Universiti Tunku Abdul Rahman (UTAR)",
  summary: "Software and systems engineer who built Kata end to end: planner, simulator and checks, signed approvals, web app and robot bridge.",
};

export interface Plan {
  id: "pilot" | "cell" | "enterprise";
  name: string;
  price: string;
  cadence: string;
  summary: string;
  features: string[];
  cta: { label: string; href: string };
  featured?: boolean;
}

export const PRICING: Plan[] = [
  {
    id: "pilot",
    name: "Founding pilot",
    price: "RM0",
    cadence: "for 90 days, one cell",
    summary: "For the first Malaysian factories. We set up one cell with you and measure the payback on your line.",
    features: [
      "One robot cell, one task",
      "On-site setup and a line visit from our team",
      "Kata for your operators in EN, BM and 中文",
      "URScript export for Universal Robots arms",
      "Payback report at the end",
    ],
    cta: { label: "Apply for the pilot", href: "/pilot" },
  },
  {
    id: "cell",
    name: "Cell",
    price: "RM1,200",
    cadence: "per cell, per month, billed yearly",
    summary: "Kata for every robot cell on your floor. Change a task in minutes instead of waiting for an integrator.",
    features: [
      "Unlimited programs and changeovers",
      "Simulation, reach and collision checks before every run",
      "Palletising, machine tending and pick and place",
      "Operator accounts and an approval step",
      "Updates and email support",
    ],
    cta: { label: "Book a walkthrough", href: "/book" },
    featured: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "multiple sites or integrators",
    summary: "For groups with several plants, and for system integrators who deploy Kata with their customers.",
    features: [
      "Everything in Cell, across all your sites",
      "Single sign-on and audit logs",
      "Private planner option, data kept in Malaysia",
      "Priority support with response times",
      "Integrator partner programme",
    ],
    cta: { label: "Talk to us", href: "/book" },
  },
];

export type Asker = "operators" | "engineers" | "finance";

export const FAQ: { q: string; a: string; who: Asker }[] = [
  {
    q: "Does Seventh Axis sell robots?",
    a: "No. Seventh Axis makes software. You buy the robot arm from your usual supplier or integrator, and Kata, our product, lets your team program it in plain language, with every move checked in simulation first.",
    who: "finance",
  },
  {
    q: "Can I program a robot arm in Bahasa Malaysia?",
    a: "Yes. Kata understands English, Bahasa Malaysia, Chinese and Manglish, typed or spoken, and turns the instruction into a robot program you can check in simulation before it runs.",
    who: "operators",
  },
  {
    q: "Which robot arms does Kata work with?",
    a: "Programs export as URScript for Universal Robots arms today. More controllers are on the roadmap, and the planner itself is independent of the arm brand.",
    who: "engineers",
  },
  {
    q: "How much does it cost?",
    a: "The founding pilot is free for 90 days on one cell. After that, Kata is RM1,200 per robot cell per month, billed yearly. Groups with several sites and integrators get custom pricing.",
    who: "finance",
  },
  {
    q: "How much does a robot cell cost in Malaysia?",
    a: "A collaborative palletising or machine-tending cell with arm, gripper, guarding and installation typically costs RM120,000 to RM250,000 from an integrator. The Smart Automation Grant can match part of eligible costs, and our ROI calculator shows the payback with Malaysian wages and levies.",
    who: "finance",
  },
  {
    q: "Does the Smart Automation Grant cover robots?",
    a: "The Smart Automation Grant is a matching grant for Malaysian manufacturers and service companies that automate. Robot cells and their integration are typical eligible costs; coverage depends on approval.",
    who: "finance",
  },
  {
    q: "Is it safe to let an AI program a robot?",
    a: "The AI only decides what moves where. Every move is checked for reach, collisions, payload and fragile items in a digital twin, speeds are capped, and nothing runs until an operator approves the program.",
    who: "engineers",
  },
  {
    q: "Do we need a robot programmer on staff?",
    a: "No. Line staff describe the task in their own words. An engineer reviews and approves the simulated program, then loads it on the teach pendant.",
    who: "operators",
  },
  {
    q: "What if I describe the job wrong?",
    a: "Kata shows the plan step by step and plays it in the digital twin before anything runs. If it isn't what you meant, say it differently. Nothing moves until a supervisor approves the exact program.",
    who: "operators",
  },
  {
    q: "What does the bridge need on our side?",
    a: "A PC on the same network as the robot controller, with Node.js 20 or newer. The bridge talks to Universal Robots controllers over RTDE and the Dashboard Server, and refuses any program that isn't signed, or was changed, reused or approved too long ago.",
    who: "engineers",
  },
];

export const PAGES: { path: string; title: string; about: string }[] = [
  { path: "/", title: "Home", about: "Seventh Axis, an AI company, and its two products: Kata and Heimdall" },
  { path: "/product", title: "Kata", about: "How Kata works: planning, checks, approvals, the bridge; and the FAQ" },
  { path: "/docs", title: "Documentation", about: "Quick start, concepts, URSim, pairing the bridge, bridge commands" },
  { path: "/heimdall", title: "Heimdall", about: "Maritime domain awareness for enforcement agencies: SAR dark targets, AIS disabling, ship-to-ship encounters, case management; agency briefings only" },
  { path: "/industries", title: "Industries", about: "E&E, palletising, small batches, machine tending; Malaysian labour costs" },
  { path: "/roi", title: "ROI calculator", about: "Payback with Malaysian wages, EPF, SOCSO, levy and the Smart Automation Grant" },
  { path: "/pricing", title: "Pricing", about: "Founding pilot, Cell and Enterprise plans" },
  { path: "/safety", title: "Safety and security", about: "How moves are checked, ISO 10218 and ISO/TS 15066 context, PDPA and data" },
  { path: "/about", title: "About and investors", about: "The company, its founder, the business plan, financial model and seed round" },
  { path: "/founder", title: "Founder", about: "Zishaan Ahmed, who founded Seventh Axis and built Kata" },
  { path: "/pilot", title: "Pilot programme", about: "Apply for the free founding pilot" },
  { path: "/book", title: "Book a meeting", about: "Intro call, Kata walkthrough, line visit or Heimdall briefing" },
];

/** The assistant's briefing: facts it may state, and nothing else about the company. */
export function knowledgeText(): string {
  return [
    "Seventh Axis is an AI company in Kuala Lumpur with two products, Kata and Heimdall. Both keep a named person in charge: the AI plans or flags, a person approves.",
    "Kata (Malay for 'word') lets factory staff program industrial and collaborative robot arms by describing the task in English, Bahasa Malaysia, Chinese or Manglish, typed or spoken. Kata is invite-only for now: approved emails sign in at /app; others can apply for the pilot or book a walkthrough.",
    "Heimdall is maritime domain awareness for Malaysian waters, sold only to government and enforcement agencies and their partners, never to the public. Treat questions from the public briefly and point agencies to a briefing. It supports IUU fishing enforcement and narcotics interdiction at sea. It compares live ship positions (AIS) with satellite radar detections (Copernicus Sentinel-1, through Global Fishing Watch) across the whole Malaysian EEZ and raises cases for vessels that go dark: dense groups of radar contacts with no broadcast (with how many look like fishing boats) and ships that switch AIS off. A named analyst approves or dismisses every case. Working today: live AIS with 48-hour tracks, 30 days of dark radar contacts, dark-group and AIS-off cases, a likely-fishing filter, satellite base maps, and a case queue with a decision log. Also working: ship-to-ship encounters (meetings at sea) and AIS-disabling cases from the live feed within the hour. In development (not built yet): watch zones, satellite AIS, in-house SAR detection, natural-language query for analysts, case export. It watches vessels and patterns, not individuals; it doesn't identify crews or target anything, and agencies decide what to do. Built for maritime enforcement, the navy, marine police, customs, fisheries and port authorities. There is no public demo; access is limited to approved accounts, and briefings are booked at /book (Heimdall briefing). Don't state customers, prices, deployments or catch figures for Heimdall.",
    "Every plan is simulated in a digital twin first: reach, collisions, payload, fragile items and cycle time are checked, speeds are capped, and a person approves before the program is exported (URScript for Universal Robots arms today; other controllers on the roadmap).",
    "The Studio demo cell has a conveyor, two pallets, a reject bin, a CNC machine with billets, a 14 kg crate (over the 10 kg payload), a fragile box and a camera-flagged damaged box. It can palletise, sort by colour, tend the CNC, run continuous production, slow down when a person comes near, and has a simulation-only playground (throws, juggling, towers).",
    "Seventh Axis does not sell robots or hardware. Customers buy arms from their usual supplier or integrator.",
    `Founder: ${FOUNDER.name}. ${FOUNDER.summary} LinkedIn: ${FOUNDER.linkedin}. GitHub: ${FOUNDER.github}. More on /founder. The company is based in Kuala Lumpur, Malaysia.`,
    "Pricing: " + PRICING.map((p) => `${p.name}: ${p.price} ${p.cadence}. ${p.summary}`).join(" "),
    "FAQ: " + FAQ.map((f) => `Q: ${f.q} A: ${f.a}`).join(" "),
    "Pages: " + PAGES.map((p) => `${p.path} (${p.title}: ${p.about})`).join("; "),
  ].join("\n");
}
