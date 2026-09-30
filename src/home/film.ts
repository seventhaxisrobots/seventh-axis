import "../styles/film.css";
import { startGlobe } from "./globe.ts";

// The launch film plays over the home page once per session, or whenever the
// URL has ?film. The inline script in index.html decides and sets .film-on.

const ENDINGS = new Set(["f-out", "f-leave"]);
const OPENING_ENDS = 8.3;
const MAX_WAIT = 5000;

function random(seed: number): () => number {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

function scatterDust(host: Element, rnd: () => number): void {
  let html = "";
  for (let i = 0; i < 70; i++) {
    const size = (1 + rnd() * 2).toFixed(1);
    html += `<span class="f-dot" style="left:${(rnd() * 100).toFixed(2)}%;top:${(rnd() * 100).toFixed(2)}%;width:${size}px;height:${size}px;animation:f-twinkle ${(2 + rnd() * 4).toFixed(2)}s ease-in-out ${(-rnd() * 6).toFixed(2)}s infinite"></span>`;
  }
  host.innerHTML = html;
}

function scatterStars(host: Element, rnd: () => number): void {
  let html = "";
  for (let i = 0; i < 110; i++) {
    const size = (1.5 + rnd() * 3).toFixed(1);
    const duration = 1.4 + rnd() * 2.2;
    html += `<span class="f-dot" style="left:${(rnd() * 100).toFixed(2)}%;top:${(rnd() * 100).toFixed(2)}%;width:${size}px;height:${size}px;animation:f-warp ${duration.toFixed(2)}s linear ${(-rnd() * duration).toFixed(2)}s infinite"></span>`;
  }
  host.innerHTML = html;
}

export function initFilm(): void {
  const film = document.querySelector<HTMLElement>("[data-film]");
  if (!film) return;
  const root = document.documentElement;
  if (!root.classList.contains("film-on")) {
    film.remove();
    return;
  }
  film.classList.add("is-playing", "is-waiting");

  // Keep the cut that matches the screen: wide, or tall for phones held upright.
  const tall = matchMedia("(max-aspect-ratio: 1/1)").matches;
  const stage = film.querySelector<HTMLElement>(tall ? ".film__stage--tall" : ".film__stage--wide");
  film.querySelectorAll("[data-film-stage]").forEach((s) => s !== stage && s.remove());
  stage?.classList.add("is-chosen");
  const [stageW, stageH] = tall ? [1080, 1920] : [1920, 1080];

  // The globe follows the film's own clock, so it stays in sync however the film is played.
  const progress = film.querySelector(".f-progress")?.getAnimations()[0];
  const clock = () => Number(progress?.currentTime ?? 0) / 1000;
  const canvas = film.querySelector<HTMLCanvasElement>("[data-film-globe]");
  let globe: Promise<void> = Promise.resolve();
  try {
    if (canvas) globe = startGlobe(canvas, clock, OPENING_ENDS).ready;
  } catch {
    // No WebGL: the film runs over black.
  }
  const wait = new Promise((resolve) => setTimeout(resolve, MAX_WAIT));
  Promise.race([globe, wait])
    .catch(() => undefined)
    .then(() => film.classList.remove("is-waiting"));

  const rnd = random(7);
  film.querySelectorAll("[data-film-dust]").forEach((host) => scatterDust(host, rnd));
  const stars = film.querySelector("[data-film-stars]");
  if (stars) scatterStars(stars, rnd);

  const fit = () => root.style.setProperty("--film-scale", String(Math.min(innerWidth / stageW, innerHeight / stageH)));
  fit();
  addEventListener("resize", fit);

  // Keep focus and screen readers on the film while it plays.
  const behind = [...document.body.children].filter(
    (el): el is HTMLElement => el instanceof HTMLElement && el !== film && !el.inert,
  );
  behind.forEach((el) => (el.inert = true));

  const skip = () => {
    film.classList.remove("is-waiting");
    film.classList.add("is-leaving");
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") skip();
  };
  film.querySelector("[data-film-skip]")?.addEventListener("click", skip);
  document.addEventListener("keydown", onKey);

  // Start the home page reveal as the film fades, then clean up.
  film.addEventListener("animationstart", (e) => {
    if (e.target === film && ENDINGS.has(e.animationName)) root.classList.remove("film-on");
  });
  film.addEventListener("animationend", (e) => {
    if (e.target !== film || !ENDINGS.has(e.animationName)) return;
    removeEventListener("resize", fit);
    document.removeEventListener("keydown", onKey);
    behind.forEach((el) => (el.inert = false));
    film.remove();
  });
}
