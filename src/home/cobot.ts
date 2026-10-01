// The cobot builds the headline: as the visitor scrolls, a cobot lifts word tiles
// off a conveyor and sets them into "Robots should understand the people who run them."
// Scroll position drives every pose, so scrolling back up un-builds the line.

interface Pt {
  x: number;
  y: number;
}

interface Layout {
  w: number;
  h: number;
  shoulder: Pt;
  l1: number;
  l2: number;
  beltX: [number, number];
  beltY: number;
  pickX: number;
  spacing: number;
  home: Pt;
  floorY: number;
  lines: number[][];
  lineY: number[];
}

const WORDS = ["Robots", "should", "understand", "the", "people", "who", "run", "them."];
const TOOL = 70; // wrist centre to the bottom of the suction cup
const BOX_H = 96; // a word at full size, padding included
const SMALL = 0.42; // a word as a tile on the belt
const FONT = "600 84px 'Barlow Semi Condensed', sans-serif";
const BUILD = WORDS.length + 0.6; // one unit per word, then back home

const WIDE: Layout = {
  w: 1440,
  h: 900,
  shoulder: { x: 760, y: 760 },
  l1: 420,
  l2: 420,
  beltX: [960, 1460],
  beltY: 790,
  pickX: 1060,
  spacing: 180,
  home: { x: 930, y: 470 },
  floorY: 860,
  lines: [[0, 1, 2], [3, 4, 5, 6, 7]],
  lineY: [205, 312],
};

const TALL: Layout = {
  w: 800,
  h: 1200,
  shoulder: { x: 300, y: 1020 },
  l1: 520,
  l2: 520,
  beltX: [480, 820],
  beltY: 1050,
  pickX: 570,
  spacing: 160,
  home: { x: 430, y: 700 },
  floorY: 1110,
  lines: [[0, 1], [2], [3, 4, 5], [6, 7]],
  lineY: [230, 330, 430, 530],
};

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
const span = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
const lerp = (a: Pt, b: Pt, u: number): Pt => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
const arc = (a: Pt, b: Pt, u: number, h: number): Pt => ({ ...lerp(a, b, u), y: a.y + (b.y - a.y) * u - Math.sin(Math.PI * u) * h });
const mix = (a: number[], b: number[], u: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(",")})`;
const INK_BROWN = [59, 42, 23];
const PAPER = [243, 241, 236];

export function initCobot(): void {
  const section = document.querySelector<HTMLElement>("[data-cobot]");
  const stage = section?.querySelector<HTMLElement>("[data-cobot-stage]");
  if (!section || !stage) return;

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) section.classList.add("cobot--still");

  let L: Layout = WIDE;
  let widths = WORDS.map((w) => w.length * 38);
  let final: Pt[] = [];
  let parts: ReturnType<typeof build>;
  let shown = still ? BUILD : 0;
  let target = shown;
  let running = false;

  const measure = () => {
    const c = document.createElement("canvas").getContext("2d");
    if (!c) return;
    c.font = FONT;
    widths = WORDS.map((w) => c.measureText(w).width);
    final = layout();
    draw(shown);
  };

  // Where each word sits in the finished, centred headline.
  const layout = (): Pt[] => {
    const box = widths.map((w) => w + 28);
    const out: Pt[] = [];
    L.lines.forEach((line, row) => {
      const total = line.reduce((sum, i) => sum + box[i], 0) - 4 * (line.length - 1);
      let x = L.w / 2 - total / 2;
      for (const i of line) {
        out[i] = { x: x + box[i] / 2, y: L.lineY[row] };
        x += box[i] - 4;
      }
    });
    return out;
  };

  const fit = () => {
    const wide = section.clientWidth / Math.max(1, window.innerHeight) >= 1;
    const next = wide ? WIDE : TALL;
    if (next !== L || !parts) {
      L = next;
      parts = build(stage, L);
      final = layout();
    }
    const k = Math.min(section.clientWidth / L.w, window.innerHeight / L.h);
    stage.style.width = `${L.w}px`;
    stage.style.height = `${L.h}px`;
    stage.style.transform = `translate(-50%, -50%) scale(${k})`;
    draw(shown);
  };

  const ik = (t: Pt) => {
    const { shoulder: S, l1, l2 } = L;
    const dx = t.x - S.x;
    const dy = t.y - S.y;
    const d = Math.max(40, Math.min(l1 + l2 - 2, Math.hypot(dx, dy)));
    const a = Math.atan2(dy, dx);
    const b = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d));
    const e = { x: S.x + l1 * Math.cos(a - b), y: S.y + l1 * Math.sin(a - b) };
    const f = Math.atan2(t.y - e.y, t.x - e.x);
    return { e, w: { x: e.x + l2 * Math.cos(f), y: e.y + l2 * Math.sin(f) } };
  };

  function draw(P: number): void {
    const n = WORDS.length;
    const wrist = (c: Pt, sc: number): Pt => ({ x: c.x, y: c.y - (BOX_H * sc) / 2 - TOOL });
    const pickC = { x: L.pickX, y: L.beltY - (BOX_H * SMALL) / 2 };
    const pickDown = wrist(pickC, SMALL);
    const pickHover = { x: pickDown.x, y: pickDown.y - 70 };
    const placeDown = (i: number) => wrist(final[i], 1);
    const placeHover = (i: number) => ({ x: final[i].x, y: placeDown(i).y - 40 });

    const k = Math.min(n, Math.floor(P));
    const t = P - k;
    let goal: Pt;
    let suck = 0;
    let queue = k;
    if (k >= n) {
      goal = lerp(placeHover(n - 1), L.home, ease(clamp((P - n) / 0.6)));
    } else {
      const from = k === 0 ? L.home : placeHover(k - 1);
      if (t < 0.22) goal = arc(from, pickHover, ease(span(0, 0.22, t)), 50);
      else if (t < 0.32) goal = lerp(pickHover, pickDown, ease(span(0.22, 0.32, t)));
      else if (t < 0.4) goal = pickDown;
      else if (t < 0.5) goal = lerp(pickDown, pickHover, ease(span(0.4, 0.5, t)));
      else if (t < 0.78) goal = arc(pickHover, placeHover(k), ease(span(0.5, 0.78, t)), 60);
      else if (t < 0.88) goal = lerp(placeHover(k), placeDown(k), ease(span(0.78, 0.88, t)));
      else if (t < 0.94) goal = placeDown(k);
      else goal = lerp(placeDown(k), placeHover(k), ease(span(0.94, 1, t)));
      suck = t >= 0.32 && t < 0.92 ? 0.9 : 0;
      // The belt brings the next word up once this one has been lifted.
      queue = k + ease(span(0.42, 0.78, t));
    }
    const { e, w } = ik(goal);

    parts.words.forEach((el, i) => {
      let x: number, y: number, sc: number, tile: number;
      if (i < k || (i === k && t >= 0.9)) {
        ({ x, y } = final[i]);
        sc = 1;
        tile = 0;
      } else if (i === k && t >= 0.4) {
        sc = SMALL + (1 - SMALL) * ease(span(0.5, 0.78, t));
        tile = 1 - span(0.6, 0.86, t);
        x = w.x;
        y = w.y + TOOL + (BOX_H * sc) / 2;
      } else {
        x = L.pickX + (i - queue) * L.spacing;
        y = pickC.y;
        sc = SMALL;
        tile = 1;
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      el.style.background = `rgba(201, 164, 110, ${tile.toFixed(3)})`;
      el.style.color = mix(INK_BROWN, PAPER, 1 - tile);
      el.style.boxShadow = `0 ${(10 * tile).toFixed(1)}px ${(20 * tile).toFixed(1)}px rgba(0, 0, 0, ${(0.4 * tile).toFixed(3)})`;
    });

    const set = (el: Element, attrs: Record<string, number | string>) => {
      for (const [k2, v] of Object.entries(attrs)) el.setAttribute(k2, typeof v === "number" ? v.toFixed(1) : v);
    };
    const S = L.shoulder;
    set(parts.upper, { x1: S.x, y1: S.y, x2: e.x, y2: e.y });
    set(parts.fore, { x1: e.x, y1: e.y, x2: w.x, y2: w.y });
    for (const c of parts.elbow) set(c, { cx: e.x, cy: e.y });
    for (const c of parts.wrist) set(c, { cx: w.x, cy: w.y });
    set(parts.shaft, { x: w.x - 11, y: w.y });
    const cupY = w.y + TOOL;
    set(parts.cup, {
      points: [[w.x - 9, w.y + 50], [w.x + 9, w.y + 50], [w.x + 26, cupY], [w.x - 26, cupY]].map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" "),
    });
    set(parts.glow, { cx: w.x, cy: cupY, opacity: String(suck) });
    parts.belt.setAttribute("patternTransform", `translate(${(-(queue * L.spacing) % 36).toFixed(1)} 0)`);
  }

  const progress = () => {
    const r = section.getBoundingClientRect();
    const run = r.height - window.innerHeight;
    return run > 0 ? clamp(-r.top / run) * BUILD : BUILD;
  };

  // Ease the shown pose towards the scroll position so wheel steps don't jerk the arm.
  const tick = () => {
    shown += (target - shown) * 0.16;
    if (Math.abs(target - shown) < 0.0005) shown = target;
    draw(shown);
    if (shown !== target) requestAnimationFrame(tick);
    else running = false;
  };
  const onScroll = () => {
    if (still) return;
    target = progress();
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  };

  fit();
  measure();
  document.fonts?.load(FONT).then(measure).catch(() => undefined);
  window.addEventListener("resize", fit);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function build(stage: HTMLElement, L: Layout) {
  const [x0, x1] = L.beltX;
  const S = L.shoulder;
  stage.innerHTML = `
    <svg class="cobot__layer" viewBox="0 0 ${L.w} ${L.h}" width="${L.w}" height="${L.h}">
      <defs>
        <pattern id="cobot-belt" width="36" height="16" patternUnits="userSpaceOnUse">
          <rect width="36" height="16" fill="#151a21"></rect>
          <rect width="6" height="16" fill="#28303b"></rect>
        </pattern>
      </defs>
      <line x1="0" y1="${L.floorY}" x2="${L.w}" y2="${L.floorY}" stroke="#232a34" stroke-width="2"></line>
      <rect x="${x0}" y="${L.beltY}" width="${x1 - x0}" height="16" fill="url(#cobot-belt)"></rect>
      <rect x="${x0}" y="${L.beltY + 16}" width="${x1 - x0}" height="22" fill="#1c222b"></rect>
      <rect x="${x0 - 4}" y="${L.beltY - 6}" width="${x1 - x0 + 4}" height="6" rx="3" fill="#3a4350"></rect>
      <circle cx="${x0 + 12}" cy="${L.beltY + 16}" r="12" fill="#3a4350"></circle>
      <rect x="${x0 + 44}" y="${L.beltY + 38}" width="12" height="${L.floorY - L.beltY - 38}" fill="#2a313c"></rect>
      <rect x="${x1 - 76}" y="${L.beltY + 38}" width="12" height="${L.floorY - L.beltY - 38}" fill="#2a313c"></rect>
      <rect x="${S.x - 60}" y="${S.y + 32}" width="120" height="${L.floorY - S.y - 32}" rx="10" fill="#1c222b"></rect>
      <rect x="${S.x - 44}" y="${S.y + 24}" width="88" height="14" rx="4" fill="#2a313c"></rect>
    </svg>
    ${WORDS.map((w) => `<span class="cobot__word">${w}</span>`).join("")}
    <svg class="cobot__layer" viewBox="0 0 ${L.w} ${L.h}" width="${L.w}" height="${L.h}">
      <line data-upper stroke="#e9e6df" stroke-width="46" stroke-linecap="round"></line>
      <line data-fore stroke="#e9e6df" stroke-width="38" stroke-linecap="round"></line>
      <circle cx="${S.x}" cy="${S.y}" r="34" fill="#2a313c"></circle>
      <circle cx="${S.x}" cy="${S.y}" r="20" fill="#6fb6e8"></circle>
      <circle data-elbow r="30" fill="#2a313c"></circle>
      <circle data-elbow r="17" fill="#6fb6e8"></circle>
      <rect data-shaft width="22" height="52" fill="#2a313c"></rect>
      <circle data-wrist r="24" fill="#2a313c"></circle>
      <circle data-wrist r="13" fill="#6fb6e8"></circle>
      <polygon data-cup fill="#3a4350"></polygon>
      <ellipse data-glow rx="28" ry="5" fill="#2ec4b6" opacity="0"></ellipse>
    </svg>`;
  const q = (s: string) => stage.querySelector(s)!;
  return {
    words: [...stage.querySelectorAll<HTMLElement>(".cobot__word")],
    belt: q("#cobot-belt"),
    upper: q("[data-upper]"),
    fore: q("[data-fore]"),
    elbow: [...stage.querySelectorAll("[data-elbow]")],
    wrist: [...stage.querySelectorAll("[data-wrist]")],
    shaft: q("[data-shaft]"),
    cup: q("[data-cup]"),
    glow: q("[data-glow]"),
  };
}
