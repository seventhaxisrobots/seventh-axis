// The ROI model behind /roi. Deliberately simple and conservative: it counts
// labour hours the robot takes over, not headcount cut, and it is transparent
// about every assumption so a factory can check the numbers.

export type Task = "palletising" | "tending" | "picking";

export interface RoiInput {
  task: Task;
  shifts: number; // 1 to 3
  perShift: number; // operators on this task per shift
  wage: number; // RM per month, per operator
  foreignShare: number; // 0 to 1
  cellPrice: number; // RM, arm + gripper + guarding + install
  grantShare: number; // 0 to 0.7, Smart Automation Grant coverage
}

/** Share of the task's labour the robot takes over. */
export const COVERAGE: Record<Task, number> = { palletising: 0.9, tending: 0.85, picking: 0.75 };

export const ASSUMPTIONS = {
  minimumWage: 1700, // RM per month since August 2025
  levyYearly: 1850, // RM per foreign manufacturing worker
  localOncost: 0.13 + 0.0175 + 0.002, // employer EPF, SOCSO, EIS
  foreignOncost: 0.02 + 0.0125, // employer EPF (from Oct 2025), SOCSO employment injury
  subscriptionMonthly: 1200, // Seventh Axis, per cell (placeholder pricing)
  maintenanceRate: 0.03, // of cell price, per year
  maxGrant: 0.7,
  horizonMonths: 36,
} as const;

export const DEFAULTS: RoiInput = {
  task: "palletising",
  shifts: 2,
  perShift: 2,
  wage: 1900,
  foreignShare: 0.5,
  cellPrice: 165_000,
  grantShare: 0.5,
};

export interface RoiResult {
  operators: number;
  labourYearly: number;
  freedYearly: number;
  runningYearly: number;
  netYearly: number;
  upfront: number;
  paybackMonths: number | null; // null when it never pays back
  horizonNet: number;
  /** Cumulative cash position at month 0..horizon. */
  curve: number[];
}

export function clampInput(i: Partial<RoiInput>): RoiInput {
  const n = (v: unknown, min: number, max: number, d: number) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : d;
  };
  return {
    task: i.task && i.task in COVERAGE ? i.task : DEFAULTS.task,
    shifts: Math.round(n(i.shifts, 1, 3, DEFAULTS.shifts)),
    perShift: Math.round(n(i.perShift, 1, 6, DEFAULTS.perShift)),
    wage: n(i.wage, ASSUMPTIONS.minimumWage, 10_000, DEFAULTS.wage),
    foreignShare: n(i.foreignShare, 0, 1, DEFAULTS.foreignShare),
    cellPrice: n(i.cellPrice, 60_000, 600_000, DEFAULTS.cellPrice),
    grantShare: n(i.grantShare, 0, ASSUMPTIONS.maxGrant, DEFAULTS.grantShare),
  };
}

export function roi(input: RoiInput): RoiResult {
  const a = ASSUMPTIONS;
  const operators = input.shifts * input.perShift;
  const localMonthly = input.wage * (1 + a.localOncost);
  const foreignMonthly = input.wage * (1 + a.foreignOncost) + a.levyYearly / 12;
  const perOperatorMonthly = localMonthly * (1 - input.foreignShare) + foreignMonthly * input.foreignShare;

  const labourYearly = perOperatorMonthly * 12 * operators;
  const freedYearly = labourYearly * COVERAGE[input.task];
  const runningYearly = a.subscriptionMonthly * 12 + input.cellPrice * a.maintenanceRate;
  const netYearly = freedYearly - runningYearly;
  const upfront = input.cellPrice * (1 - input.grantShare);
  const netMonthly = netYearly / 12;
  const paybackMonths = netMonthly > 0 ? upfront / netMonthly : null;
  const curve = Array.from({ length: a.horizonMonths + 1 }, (_, m) => -upfront + netMonthly * m);

  return {
    operators,
    labourYearly,
    freedYearly,
    runningYearly,
    netYearly,
    upfront,
    paybackMonths,
    horizonNet: curve[curve.length - 1],
    curve,
  };
}

export function toQuery(i: RoiInput): string {
  const p = new URLSearchParams({
    task: i.task,
    shifts: String(i.shifts),
    people: String(i.perShift),
    wage: String(Math.round(i.wage)),
    foreign: String(Math.round(i.foreignShare * 100)),
    cell: String(Math.round(i.cellPrice)),
    grant: String(Math.round(i.grantShare * 100)),
  });
  return p.toString();
}

export function fromQuery(search: string): RoiInput {
  const p = new URLSearchParams(search);
  const pct = (k: string) => (p.has(k) ? Number(p.get(k)) / 100 : undefined);
  return clampInput({
    task: (p.get("task") as Task) ?? undefined,
    shifts: p.has("shifts") ? Number(p.get("shifts")) : undefined,
    perShift: p.has("people") ? Number(p.get("people")) : undefined,
    wage: p.has("wage") ? Number(p.get("wage")) : undefined,
    foreignShare: pct("foreign"),
    cellPrice: p.has("cell") ? Number(p.get("cell")) : undefined,
    grantShare: pct("grant"),
  });
}

export const rm = (x: number) => `RM${Math.round(x).toLocaleString("en-MY")}`;
export const rmShort = (x: number) =>
  Math.abs(x) >= 1_000_000 ? `RM${(x / 1_000_000).toFixed(1)}m` : `RM${Math.round(x / 1000)}k`;
