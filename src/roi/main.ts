import { initSite } from "../site/site.ts";
import { bindForm } from "../site/forms.ts";
import "../styles/landing.css";
import "../styles/roi.css";
import { ASSUMPTIONS, clampInput, fromQuery, rm, rmShort, roi, toQuery, type RoiInput, type RoiResult, type Task } from "./model.ts";

initSite();

const form = document.querySelector<HTMLFormElement>("[data-roi-form]")!;
const q = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const SVG = "http://www.w3.org/2000/svg";

let input: RoiInput = fromQuery(location.search);
let result: RoiResult = roi(input);

// Inputs ------------------------------------------------------------------

function writeInputs(): void {
  const set = (name: string, value: string) => {
    const el = form.elements.namedItem(name);
    if (el instanceof RadioNodeList) el.value = value;
    else if (el instanceof HTMLInputElement) el.value = value;
  };
  set("task", input.task);
  set("shifts", String(input.shifts));
  set("people", String(input.perShift));
  set("wage", String(input.wage));
  set("foreign", String(Math.round(input.foreignShare * 100)));
  set("cell", String(input.cellPrice));
  set("grant", String(Math.round(input.grantShare * 100)));
}

function readInputs(): RoiInput {
  const v = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | RadioNodeList).value;
  return clampInput({
    task: v("task") as Task,
    shifts: Number(v("shifts")),
    perShift: Number(v("people")),
    wage: Number(v("wage")),
    foreignShare: Number(v("foreign")) / 100,
    cellPrice: Number(v("cell")),
    grantShare: Number(v("grant")) / 100,
  });
}

function writeOutputs(): void {
  const out = (key: string, text: string) => (q(`[data-out="${key}"]`).textContent = text);
  out("people", String(input.perShift));
  out("wage", rm(input.wage));
  out("foreign", `${Math.round(input.foreignShare * 100)}%`);
  out("cell", rm(input.cellPrice));
  out("grant", `${Math.round(input.grantShare * 100)}%`);
}

// Results -----------------------------------------------------------------

function renderResults(): void {
  const r = result;
  const hero = q("[data-payback]");
  if (r.paybackMonths === null) hero.textContent = "Doesn't pay back";
  else if (r.paybackMonths > ASSUMPTIONS.horizonMonths) hero.textContent = `${Math.ceil(r.paybackMonths)} months`;
  else hero.textContent = `${Math.max(1, Math.ceil(r.paybackMonths))} months`;
  hero.classList.toggle("is-slow", r.paybackMonths === null || r.paybackMonths > ASSUMPTIONS.horizonMonths);

  const fig = (key: string, text: string) => (q(`[data-fig="${key}"]`).textContent = text);
  fig("labour", rm(r.labourYearly));
  fig("freed", rm(r.freedYearly));
  fig("running", rm(r.runningYearly));
  fig("upfront", rm(r.upfront));
  fig("net", `${r.horizonNet < 0 ? "−" : ""}${rm(Math.abs(r.horizonNet))}`);
  q("[data-fig=net]").classList.toggle("is-negative", r.horizonNet < 0);

  q("[data-table]").replaceChildren(
    ...r.curve
      .map((v, m) => [m, v] as const)
      .filter(([m]) => m % 6 === 0)
      .map(([m, v]) => {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td></td>";
        tr.cells[0].textContent = String(m);
        tr.cells[1].textContent = `${v < 0 ? "−" : ""}${rm(Math.abs(v))}`;
        return tr;
      }),
  );

  q<HTMLInputElement>("[data-roi-summary]").value = summary();
  q("[data-peek]").textContent = `Payback ${hero.textContent?.toLowerCase()} · net ${r.horizonNet < 0 ? "−" : ""}${rmShort(Math.abs(r.horizonNet))} in 3 years`;
  drawChart();
}

function summary(): string {
  const r = result;
  const pay = r.paybackMonths === null ? "no payback" : `payback ${Math.ceil(r.paybackMonths)} months`;
  return (
    `ROI calculator: ${input.task}, ${input.shifts} shift(s) x ${input.perShift} operator(s), wage ${rm(input.wage)}, ` +
    `${Math.round(input.foreignShare * 100)}% foreign, cell ${rm(input.cellPrice)}, grant ${Math.round(input.grantShare * 100)}%. ` +
    `Estimate: ${pay}, net ${rm(r.horizonNet)} after 3 years.`
  );
}

// Chart: one series, so no legend; a crosshair tooltip on hover and a table view.

const plot = q("[data-chart]");
const tip = document.createElement("div");
tip.className = "roi__tip";
tip.hidden = true;
plot.append(tip);

function el<K extends keyof SVGElementTagNameMap>(name: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function drawChart(): void {
  plot.querySelector("svg")?.remove();
  const w = Math.max(280, plot.clientWidth);
  const h = 240;
  const pad = { l: 56, r: 12, t: 16, b: 28 };
  const curve = result.curve;
  const lo = Math.min(0, ...curve);
  const hi = Math.max(0, ...curve);
  const span = hi - lo || 1;
  const x = (m: number) => pad.l + (m / (curve.length - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / span) * (h - pad.t - pad.b);

  const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, width: w, height: h, role: "img", "aria-label": "Cumulative cash position over 36 months" });

  // Recessive grid with value labels
  const ticks = niceTicks(lo, hi, 5);
  for (const t of ticks) {
    svg.append(el("line", { x1: pad.l, x2: w - pad.r, y1: y(t), y2: y(t), class: t === 0 ? "roi__zero" : "roi__grid" }));
    const label = el("text", { x: pad.l - 8, y: y(t) + 4, class: "roi__axis", "text-anchor": "end" });
    label.textContent = t === 0 ? "RM0" : `${t < 0 ? "−" : ""}${rmShort(Math.abs(t))}`;
    svg.append(label);
  }
  for (const m of [0, 12, 24, 36]) {
    const label = el("text", { x: x(m), y: h - 8, class: "roi__axis", "text-anchor": m === 0 ? "start" : m === 36 ? "end" : "middle" });
    label.textContent = m === 0 ? "Now" : `${m} mo`;
    svg.append(label);
  }

  const d = curve.map((v, m) => `${m ? "L" : "M"}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join("");
  svg.append(el("path", { d, class: "roi__line" }));

  const p = result.paybackMonths;
  if (p !== null && p <= curve.length - 1) {
    const px = x(p);
    svg.append(el("circle", { cx: px, cy: y(0), r: 5, class: "roi__mark" }));
    const label = el("text", { x: px, y: y(0) - 12, class: "roi__callout", "text-anchor": px > w - 110 ? "end" : "middle" });
    label.textContent = `Pays back · month ${Math.ceil(p)}`;
    svg.append(label);
  }

  // Hover layer
  const cross = el("line", { y1: pad.t, y2: h - pad.b, class: "roi__cross", visibility: "hidden" });
  const dot = el("circle", { r: 5, class: "roi__mark", visibility: "hidden" });
  const hit = el("rect", { x: pad.l, y: 0, width: w - pad.l - pad.r, height: h, fill: "transparent" });
  svg.append(cross, dot, hit);

  const show = (clientX: number) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * w;
    const m = Math.round(((px - pad.l) / (w - pad.l - pad.r)) * (curve.length - 1));
    const month = Math.min(curve.length - 1, Math.max(0, m));
    const v = curve[month];
    cross.setAttribute("x1", String(x(month)));
    cross.setAttribute("x2", String(x(month)));
    cross.setAttribute("visibility", "visible");
    dot.setAttribute("cx", String(x(month)));
    dot.setAttribute("cy", String(y(v)));
    dot.setAttribute("visibility", "visible");
    tip.hidden = false;
    tip.innerHTML = "<span></span><strong></strong>";
    tip.firstElementChild!.textContent = month === 0 ? "Today" : `Month ${month}`;
    tip.lastElementChild!.textContent = `${v < 0 ? "−" : ""}${rm(Math.abs(v))}`;
    const left = (x(month) / w) * box.width;
    tip.style.left = `${Math.min(box.width - 130, Math.max(0, left - 65))}px`;
  };
  const hide = () => {
    cross.setAttribute("visibility", "hidden");
    dot.setAttribute("visibility", "hidden");
    tip.hidden = true;
  };
  hit.addEventListener("pointermove", (e) => show(e.clientX));
  hit.addEventListener("pointerdown", (e) => show(e.clientX));
  hit.addEventListener("pointerleave", hide);

  plot.prepend(svg);
}

function niceTicks(lo: number, hi: number, count: number): number[] {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-6; t += step) out.push(Math.round(t));
  if (!out.includes(0)) out.push(0);
  return out;
}

// Wiring ------------------------------------------------------------------

function update(): void {
  input = readInputs();
  result = roi(input);
  writeOutputs();
  renderResults();
  history.replaceState(null, "", `${location.pathname}?${toQuery(input)}`);
}

writeInputs();
writeOutputs();
renderResults();
form.addEventListener("input", update);
new ResizeObserver(() => drawChart()).observe(plot);

// On phones the results sit below the sliders; a small bar keeps the answer in view until they're on screen.
const peek = q("[data-peek]");
new IntersectionObserver(([entry]) => peek.classList.toggle("is-hidden", entry.isIntersecting), { threshold: 0.2 }).observe(
  q(".roi__results"),
);

const share = q<HTMLButtonElement>("[data-share]");
share.addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}?${toQuery(input)}`;
  try {
    await navigator.clipboard.writeText(url);
    share.textContent = "Link copied";
  } catch {
    share.textContent = url;
  }
  setTimeout(() => (share.textContent = "Copy a link to these numbers"), 2200);
});

const lead = document.querySelector<HTMLFormElement>("[data-waitlist]");
if (lead) {
  bindForm({
    form: lead,
    endpoint: "/api/waitlist",
    required: {
      name: "Please enter your name.",
      email: "Please enter a valid work email.",
      consent: "Please tick the box so we can contact you.",
    },
    payload: (data) => ({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      company: String(data.get("company") ?? "").trim(),
      task: summary(),
      consent: data.get("consent") === "on",
      website: String(data.get("website") ?? ""),
    }),
    onSuccess: (res) => {
      const panel = document.createElement("div");
      panel.className = "pilot__done";
      panel.tabIndex = -1;
      panel.innerHTML = "<h3>You're on the list.</h3><p></p>";
      panel.querySelector("p")!.textContent = res.duplicate
        ? "We already had your details. We'll be in touch."
        : "Thank you. We'll reply with your estimate and next steps.";
      lead.replaceWith(panel);
      panel.focus();
    },
  });
}
