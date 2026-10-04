// Build-time markup for /investors, rendered from src/shared/business.ts by the
// html-partials plugin in vite.config.ts. No client script is needed to show any of it.

import { CASH_MONTHLY, CASH_START, MARKET, PLAN, ROUNDS, SENSITIVITIES, USE_OF_SEED } from "../shared/business.ts";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const money = (v: number, digits = 2) => (v < 0 ? `−${Math.abs(v).toFixed(digits)}` : v.toFixed(digits));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Year-end recurring revenue as columns, with the Series A marked between 2028 and 2029. */
export function arrChart(): string {
  const max = Math.max(...PLAN.map((p) => p.arr));
  const last = PLAN.at(-1)!;
  const seriesA = ROUNDS.find((r) => r.name === "Series A")!;
  const afterIndex = PLAN.findIndex((p) => p.year === Number(seriesA.month.slice(0, 4))) - 1;
  const cols = PLAN.map(
    (p) => `<div class="arr__col${p === last ? " is-key" : ""}">
            <span class="arr__val">RM${p.arr.toFixed(1)}M</span>
            <span class="arr__bar" style="--h: ${((p.arr / max) * 100).toFixed(1)}%"></span>
            <span class="arr__year">${p.year}</span>
            <span class="arr__cells">${p.cells.toLocaleString("en-US")} cells</span>
          </div>`,
  ).join("\n          ");
  return `<div class="arr" role="img" aria-label="Yearly recurring revenue grows from RM${PLAN[0].arr.toFixed(1)}M in ${PLAN[0].year} to RM${last.arr.toFixed(1)}M in ${last.year}" style="--marker: ${afterIndex + 1}; --cols: ${PLAN.length}">
          ${cols}
          <span class="arr__marker" aria-hidden="true"><span>${esc(seriesA.name)}, ${seriesA.when}<br />at about RM2.5M</span></span>
        </div>`;
}

/** Month-end cash as a line, with each round and the low point before it. */
export function cashChart(): string {
  const W = 960, H = 380, left = 56, right = 936, y0 = 64, base = 320, top = 22;
  const n = CASH_MONTHLY.length;
  const X = (i: number) => left + (i / (n - 1)) * (right - left);
  const Y = (v: number) => base - (v / top) * (base - y0);
  const monthIndex = (ym: string) => (Number(ym.slice(0, 4)) - CASH_START.year) * 12 + Number(ym.slice(5, 7)) - CASH_START.month;
  const label = (i: number) => `${MONTHS[(CASH_START.month - 1 + i) % 12]} ${CASH_START.year + Math.floor((CASH_START.month - 1 + i) / 12)}`;

  const path = CASH_MONTHLY.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join("");
  const grid = [0, 5, 10, 15, 20]
    .map((t) => `<line class="${t ? "grid" : "axis"}" x1="${left}" x2="${right}" y1="${Y(t)}" y2="${Y(t)}" /><text class="tick" x="${left - 10}" y="${Y(t) + 5}" text-anchor="end">${t}</text>`)
    .join("");
  const years = CASH_MONTHLY.map((_, i) => i)
    .filter((i) => (CASH_START.month - 1 + i) % 12 === 0)
    .map((i) => `<text class="tick" x="${X(i)}" y="${base + 28}">${label(i).slice(4)}</text>`)
    .join("");
  const rounds = ROUNDS.map((r) => {
    const x = X(monthIndex(r.month));
    return `<line class="ref" x1="${x}" x2="${x}" y1="${y0 - 16}" y2="${base}" /><text class="note" x="${x + 8}" y="${y0 - 2}">${esc(r.name)}, RM${r.amount}M · ${label(monthIndex(r.month))}</text>`;
  }).join("");
  const lows = CASH_MONTHLY.map((v, i) => ({ v, i }))
    .filter(({ v, i }) => i < n - 1 && CASH_MONTHLY[i + 1] - v > 1)
    .map(({ v, i }, k) => {
      const x = X(i), y = Y(v);
      const text = `Low RM${v.toFixed(2)}M · ${label(i)}`;
      const tag = k === 0 ? `<text class="low-label" x="${x + 30}" y="${y - 28}">${text}</text>` : `<text class="low-label" x="${x - 14}" y="${y + 16}" text-anchor="end">${text}</text>`;
      return `<circle class="low" cx="${x}" cy="${y}" r="6" />${tag}`;
    })
    .join("");

  return `<svg class="cash" viewBox="0 0 ${W} ${H}" role="img" aria-label="Month-end cash from ${label(0)} to ${label(n - 1)}, RM million">
          ${grid}${years}${rounds}<path class="line" d="${path}" />${lows}
        </svg>`;
}

const row = (cells: string[], cls = "") => `<tr${cls ? ` class="${cls}"` : ""}><th scope="row">${cells[0]}</th>${cells.slice(1).map((c) => `<td>${c}</td>`).join("")}</tr>`;

export function plTable(): string {
  let n = 0;
  const line = (name: string, pick: (p: (typeof PLAN)[number]) => string, cls = "") => row([name, ...PLAN.map(pick)], cls).replace("<tr", `<tr style="--i: ${n++}"`);
  return `<table class="fin">
          <thead><tr><th scope="col">RM million</th>${PLAN.map((p) => `<th scope="col">${p.year}</th>`).join("")}</tr></thead>
          <tbody>
            ${line("Paying cells at year end", (p) => p.cells.toLocaleString("en-US"))}
            ${line("Subscription revenue", (p) => money(p.subscription))}
            ${line("Onboarding fees", (p) => money(p.onboarding))}
            ${line("Total revenue", (p) => money(p.revenue), "is-total")}
            ${line("Cost to serve", (p) => money(p.costToServe))}
            ${line("Gross profit", (p) => money(p.grossProfit), "is-total")}
            ${line("Gross margin", (p) => pct(p.grossMargin))}
            ${line("People", (p) => money(p.people))}
            ${line("Other operating costs", (p) => money(p.other))}
            ${line("Integrator share", (p) => money(p.integratorShare))}
            ${line("Pilots", (p) => money(p.pilots))}
            ${line("Operating costs", (p) => money(p.opex), "is-total")}
            ${line("EBITDA", (p) => money(p.ebitda), "is-total is-key")}
            ${line("Equity raised", (p) => (p.raised ? money(p.raised) : "–"))}
            ${line("Cash at year end", (p) => money(p.cash))}
          </tbody>
        </table>`;
}

export function marketBars(): string {
  const max = Math.max(...MARKET.map((m) => m.value));
  return `<div class="mkt">
          ${MARKET.map(
            (m, i) => `<div class="mkt__row${i === MARKET.length - 1 ? " is-key" : ""}">
            <div class="mkt__label"><strong>${esc(m.layer)}</strong><span>${esc(m.what)}</span></div>
            <div class="mkt__track"><span class="mkt__bar" style="--w: ${((m.value / max) * 100).toFixed(1)}%"></span><span class="mkt__val">RM${m.value}M <small>${m.robots.toLocaleString("en-US")} ${i === MARKET.length - 1 ? "cells" : "robots"}</small></span></div>
          </div>`,
          ).join("\n          ")}
        </div>`;
}

export function fundsBars(): string {
  const total = USE_OF_SEED.reduce((s, u) => s + u.amount, 0);
  return `<div class="funds">
          ${USE_OF_SEED.map(
            (u) => `<div class="funds__row"><span class="funds__item">${esc(u.item)}</span><span class="funds__track"><span style="--w: ${((u.amount / total) * 100).toFixed(1)}%"></span></span><span class="funds__val">RM${u.amount.toFixed(2)}M · ${pct(u.amount / total)}</span></div>`,
          ).join("\n          ")}
          <p class="funds__total">Total spending, 2027 and 2028: RM${total.toFixed(2)}M</p>
        </div>`;
}

export function roundsCards(): string {
  return `<div class="rounds">
          ${ROUNDS.map(
            (r, i) => `<article class="round${i === 0 ? " is-key" : ""} reveal" data-tilt style="--i: ${i}">
            <p class="round__when">${esc(r.name)} · ${r.when}</p>
            <p class="round__amount" data-count="${r.amount}" data-prefix="RM" data-suffix="M">RM${r.amount}M</p>
            <p class="round__usd">about USD ${r.usd}M</p>
            <dl class="round__facts"><div><dt>Pays for</dt><dd>${esc(r.pays)}</dd></div><div><dt>Must reach</dt><dd>${esc(r.milestones)}</dd></div></dl>
          </article>`,
          ).join("\n          ")}
        </div>`;
}

export function sensitivityTable(): string {
  // EBITDA as a bar either side of zero, on one scale for every case.
  const reach = Math.max(...SENSITIVITIES.map((s) => Math.abs(s.ebitda)));
  return `<table class="fin fin--text fin--whatif">
          <thead><tr><th scope="col">Case</th><th scope="col">What changes</th><th scope="col">2031 revenue</th><th scope="col">2031 EBITDA</th><th scope="col">Cash, end 2031</th></tr></thead>
          <tbody>
            ${SENSITIVITIES.map((s, i) => {
              const bar = `<span class="dv" aria-hidden="true"><i class="${s.ebitda < 0 ? "is-neg" : "is-pos"}" style="--v: ${((Math.abs(s.ebitda) / reach) * 50).toFixed(1)}%; --i: ${i}"></i></span>`;
              return row([esc(s.name), esc(s.change), `RM${s.revenue.toFixed(1)}M`, `${bar}${s.ebitda < 0 ? "−" : "+"}RM${Math.abs(s.ebitda).toFixed(1)}M`, `RM${s.cash.toFixed(1)}M`], i === 0 ? "is-key" : "");
            }).join("\n            ")}
          </tbody>
        </table>`;
}
