// The cobot builds the headline (home page). The 3D scene and three.js load only as
// the section comes into view, so the rest of the page stays light.

const WORDS = ["Robots", "should", "understand", "the", "people", "who", "run", "them."];

export function initCobot(): void {
  const section = document.querySelector<HTMLElement>("[data-cobot]");
  const stage = section?.querySelector<HTMLElement>("[data-cobot-stage]");
  if (!section || !stage) return;

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (still) section.classList.add("cobot--still");

  const words = WORDS.map((w) => {
    const el = document.createElement("span");
    el.className = "cobot__word";
    el.textContent = w;
    stage.append(el);
    return el;
  });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    void import("./cobot3d.ts").then((m) => m.startCobot(section, stage, words, still)).catch(() => {
      // No WebGL or the chunk failed: show the finished headline as plain text.
      section.classList.add("cobot--still", "cobot--fallback");
    });
  };
  if (!("IntersectionObserver" in window)) return start();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        start();
      }
    },
    { rootMargin: "100% 0px" },
  );
  io.observe(section);
}
