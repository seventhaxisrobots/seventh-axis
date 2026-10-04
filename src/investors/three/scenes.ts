// Starts the shared 3D engine and registers each scene as its section comes near,
// so the robot models and textures load only when they're about to be seen.

import { Engine, type SceneSpec } from "./engine.ts";
import { globeScene } from "./globe.ts";
import { flowScene } from "./flow.ts";
import { marketScene } from "./market.ts";
import { chartScene } from "./chart.ts";
import { cashScene } from "./cash.ts";
import { fundsScene } from "./funds.ts";

export function startScenes(): void {
  const engine = new Engine(false);
  const make: Record<string, (stage: HTMLElement) => SceneSpec> = {
    globe: (s) => globeScene(engine, s),
    flow: (s) => flowScene(s),
    market: (s) => marketScene(s, engine.light),
    chart: (s) => chartScene(s),
    cash: (s) => cashScene(s),
    funds: (s) => fundsScene(s),
  };

  const start = (section: HTMLElement) => {
    const build = make[section.dataset.scene ?? ""];
    const stage = section.querySelector<HTMLElement>("[data-stage]");
    if (!build || !stage || section.dataset.started) return;
    section.dataset.started = "1";
    engine.add(section, build(stage));
  };

  const sections = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && (start(e.target as HTMLElement), io.unobserve(e.target))),
    { rootMargin: "150% 0px" },
  );
  sections.forEach((s) => io.observe(s));
}
