import { initSite } from "../site/site.ts";
import "../styles/landing.css";
import "../styles/pages.css";
import "../styles/investors.css";
import "../styles/investors-3d.css";
import "../styles/investors-motion.css";

initSite();

const root = document.documentElement;
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 3D scenes: three.js and the scenes load as their own chunk, only when WebGL and motion are on.
if (root.classList.contains("s3d-on")) {
  import("./three/scenes.ts")
    .then((m) => m.startScenes())
    .catch(() => root.classList.remove("s3d-on"));
}

// Over a dark 3D section the scrolled header goes dark too, instead of flashing white.
const header = document.querySelector<HTMLElement>("[data-header]");
const darks = [...document.querySelectorAll<HTMLElement>(".s3d")];
if (header && darks.length) {
  const onScroll = () => {
    const y = header.offsetHeight / 2;
    header.classList.toggle("is-dark", darks.some((s) => {
      const r = s.getBoundingClientRect();
      return r.top <= y && r.bottom >= y;
    }));
  };
  onScroll();
  addEventListener("scroll", onScroll, { passive: true });
}

// Numbers count up the first time they come into view.
function countUp(el: HTMLElement): void {
  const end = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals ?? 0);
  const fmt = (v: number) => `${el.dataset.prefix ?? ""}${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${el.dataset.suffix ?? ""}`;
  const t0 = performance.now();
  const step = (now: number) => {
    const u = Math.min(1, (now - t0) / 1400);
    el.textContent = fmt(end * (1 - Math.pow(1 - u, 4)));
    if (u < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const counters = [...document.querySelectorAll<HTMLElement>("[data-count]")];
const reveals = [...document.querySelectorAll<HTMLElement>(".reveal")];
if (!still && "IntersectionObserver" in window) {
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        if (el.dataset.count) countUp(el);
        el.classList.add("is-in");
        seen.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  root.classList.add("reveal-on");
  counters.forEach((el) => seen.observe(el));
  reveals.forEach((el) => seen.observe(el));

  // Cards lean towards the pointer, in 3D.
  for (const card of document.querySelectorAll<HTMLElement>("[data-tilt]")) {
    card.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
      card.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      card.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
      card.classList.add("is-tilting");
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.classList.remove("is-tilting");
    });
  }
}

// The milestone line draws itself as the section scrolls up the screen; each milestone lights as the line reaches it.
const timeline = document.querySelector<HTMLElement>("[data-timeline]");
if (timeline) {
  const items = [...timeline.children] as HTMLElement[];
  const update = () => {
    const r = timeline.getBoundingClientRect();
    const u = still ? 1 : Math.max(0, Math.min(1, (innerHeight * 0.85 - r.top) / (innerHeight * 0.55)));
    timeline.style.setProperty("--prog", u.toFixed(3));
    items.forEach((li, i) => li.classList.toggle("is-on", u >= i / Math.max(1, items.length - 1) - 0.001));
  };
  update();
  if (!still) addEventListener("scroll", update, { passive: true });
}

// The business-model flow map animates with SMIL, which ignores reduced motion, so pause it there.
if (still) document.querySelectorAll<SVGSVGElement>(".flowmap svg").forEach((svg) => svg.pauseAnimations());
