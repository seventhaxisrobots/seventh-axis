// The business plan's numbers, from the five-year model (base case). The /about
// page renders its charts and tables from here at build time, so they always agree.
// All money in RM million unless a field says otherwise.

export interface PlanYear {
  year: number;
  cells: number;
  arr: number;
  subscription: number;
  onboarding: number;
  revenue: number;
  costToServe: number;
  grossProfit: number;
  grossMargin: number;
  people: number;
  other: number;
  integratorShare: number;
  pilots: number;
  opex: number;
  ebitda: number;
  raised: number;
  cash: number;
}

export const PLAN: PlanYear[] = [
  { year: 2027, cells: 30, arr: 0.4, subscription: 0.2, onboarding: 0.09, revenue: 0.29, costToServe: 0.11, grossProfit: 0.18, grossMargin: 0.62, people: 0.82, other: 0.5, integratorShare: 0.01, pilots: 0.25, opex: 1.59, ebitda: -1.4, raised: 6, cash: 5.0 },
  { year: 2028, cells: 130, arr: 1.72, subscription: 1.06, onboarding: 0.26, revenue: 1.32, costToServe: 0.39, grossProfit: 0.93, grossMargin: 0.71, people: 1.92, other: 0.9, integratorShare: 0.11, pilots: 0.6, opex: 3.52, ebitda: -2.59, raised: 0, cash: 2.4 },
  { year: 2029, cells: 420, arr: 5.56, subscription: 3.64, onboarding: 0.63, revenue: 4.27, costToServe: 1.06, grossProfit: 3.21, grossMargin: 0.75, people: 3.7, other: 1.6, integratorShare: 0.44, pilots: 1.06, opex: 6.79, ebitda: -3.59, raised: 20, cash: 18.82 },
  { year: 2030, cells: 950, arr: 12.59, subscription: 9.07, onboarding: 1.04, revenue: 10.12, costToServe: 2.2, grossProfit: 7.92, grossMargin: 0.78, people: 5.98, other: 2.4, integratorShare: 1.18, pilots: 1.34, opex: 10.91, ebitda: -2.99, raised: 0, cash: 15.83 },
  { year: 2031, cells: 1800, arr: 23.85, subscription: 18.22, onboarding: 1.54, revenue: 19.76, costToServe: 3.95, grossProfit: 15.81, grossMargin: 0.8, people: 8.51, other: 3.2, integratorShare: 2.55, pilots: 1.76, opex: 16.02, ebitda: -0.22, raised: 0, cash: 15.61 },
];

/** Cash at each month end, January 2027 to December 2031 (costs and revenue spread evenly within each year). */
export const CASH_MONTHLY = [
  0.28, 0.17, 6.05, 5.93, 5.81, 5.7, 5.58, 5.46, 5.35, 5.23, 5.11, 5.0,
  4.78, 4.56, 4.35, 4.13, 3.91, 3.7, 3.48, 3.27, 3.05, 2.83, 2.62, 2.4,
  2.1, 1.8, 21.51, 21.21, 20.91, 20.61, 20.31, 20.01, 19.71, 19.41, 19.11, 18.82,
  18.57, 18.32, 18.07, 17.82, 17.57, 17.32, 17.07, 16.82, 16.57, 16.33, 16.08, 15.83,
  15.81, 15.79, 15.77, 15.76, 15.74, 15.72, 15.7, 15.68, 15.67, 15.65, 15.63, 15.61,
];
export const CASH_START = { year: 2027, month: 1 };

export const ROUNDS = [
  { name: "Seed", when: "Q1 2027", month: "2027-03", amount: 6, usd: 1.4, pays: "Founding pilots and the start of the integrator channel, 2027 and 2028", milestones: "130+ paying cells, payback proven on 10+ sites, 15 active integrators, about RM2.5M of recurring revenue" },
  { name: "Series A", when: "Q1 2029", month: "2029-03", amount: 20, usd: 4.8, pays: "Scaling the channel, a second robot brand, Thailand and Vietnam", milestones: "1,800 paying cells and break-even during 2031" },
];

export const MARKET = [
  { layer: "TAM, Malaysia", what: "Every industrial robot in Malaysian manufacturing", robots: 21000, value: 302 },
  { layer: "SAM, Malaysia", what: "Robots on pick-and-place, palletising, packing and machine tending (40%)", robots: 8400, value: 121 },
  { layer: "SAM, Malaysia 2030", what: "Same share if Malaysia reaches Thailand's robot density", robots: 11100, value: 160 },
  { layer: "ASEAN SAM, 2030", what: "Malaysia, Thailand, Vietnam and Indonesia", robots: 33000, value: 480 },
  { layer: "Our plan, 2031", what: "1,800 paying cells at list price", robots: 1800, value: 26 },
];

export const USE_OF_SEED = [
  { item: "People: engineering, pilots and support, sales and partners", amount: 2.74 },
  { item: "Office and demo lab, marketing, travel, legal, tools", amount: 1.4 },
  { item: "Running the founding pilots", amount: 0.85 },
  { item: "Cost to serve paying cells", amount: 0.5 },
  { item: "Integrator share", amount: 0.12 },
];

export const SENSITIVITIES = [
  { name: "Base case", change: "As planned", revenue: 19.8, ebitda: -0.2, cash: 15.6 },
  { name: "Slower adoption", change: "40% fewer cells every year, spending as planned", revenue: 11.9, ebitda: -4.8, cash: 8.1 },
  { name: "Slower, spending cut", change: "40% fewer cells; headcount and other costs 20–35% lower from 2029", revenue: 11.9, ebitda: -0.9, cash: 15.1 },
  { name: "Lower price", change: "Customers pay 80% of list instead of 92%", revenue: 17.4, ebitda: -2.3, cash: 12.0 },
  { name: "Faster adoption", change: "30% more cells, spending as planned", revenue: 25.7, ebitda: 3.2, cash: 21.2 },
];
