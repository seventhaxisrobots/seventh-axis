// The hero console: types an instruction, then ticks through Kata's steps, and loops
// through a few languages. Reduced motion shows one finished run.

const TASKS = [
  "“Pick up the part from the conveyor, inspect it, and place it in the bin.”",
  "“Susun 12 kotak di palet 2, tiga tingkat.”",
  "“把红色箱子叠到A号托盘上，三层。”",
  "“Load the CNC, wait for the cycle, then clear the part.”",
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function initConsole(): void {
  const root = document.querySelector<HTMLElement>("[data-console]");
  const text = root?.querySelector<HTMLElement>("[data-console-text]");
  const steps = [...(root?.querySelectorAll<HTMLElement>("[data-step]") ?? [])];
  if (!root || !text || !steps.length) return;

  const mark = (active: number) =>
    steps.forEach((el, i) => {
      el.classList.toggle("is-done", i < active || (active === steps.length - 1 && i === active));
      el.classList.toggle("is-active", i === active && active < steps.length - 1);
    });

  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    mark(steps.length - 1);
    return;
  }

  let visible = true;
  new IntersectionObserver((e) => (visible = e.some((x) => x.isIntersecting))).observe(root);

  void (async () => {
    for (let n = 0; ; n = (n + 1) % TASKS.length) {
      while (!visible || document.hidden) await wait(400);
      const task = TASKS[n];
      steps.forEach((el) => el.classList.remove("is-done", "is-active"));
      for (let i = 1; i <= task.length; i++) {
        text.textContent = task.slice(0, i);
        await wait(22);
      }
      await wait(350);
      for (let s = 0; s < steps.length; s++) {
        mark(s);
        await wait(s === steps.length - 1 ? 2600 : 760);
      }
    }
  })();
}
