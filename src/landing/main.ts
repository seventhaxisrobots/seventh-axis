import { initSite } from "../site/site.ts";
import { bindForm } from "../site/forms.ts";
import "../styles/landing.css";
import "../styles/pages.css";

initSite();

const form = document.querySelector<HTMLFormElement>("[data-waitlist]");

if (form) {
  bindForm({
    form,
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
        : "Thank you. We'll email you about the pilot soon.";
      form.replaceWith(panel);
      panel.focus();
    },
  });
}

// Product: each checklist row shows its moment in the twin.
const plan = document.querySelector<HTMLElement>("[data-plan]");
if (plan) {
  const img = plan.querySelector<HTMLImageElement>("[data-frame-img]")!;
  const caption = plan.querySelector<HTMLElement>("[data-frame-caption]")!;
  const FRAMES: Record<string, { alt: string; caption: string }> = {
    locate: { alt: "The digital twin: the arm above the red box on the conveyor", caption: "Locating the red box on the conveyor." },
    grasp: { alt: "The digital twin: the gripper closing on the red box", caption: "Grasping from the top, clear of the conveyor guard." },
    place: { alt: "The digital twin: the red box placed on pallet A", caption: "Rotated 90° and placed on pallet A, slot 1." },
    checks: { alt: "The digital twin from above, with the arm's reach envelope drawn on the floor", caption: "Every target sits inside the reach envelope, with no collisions on the way." },
  };
  const rows = [...plan.querySelectorAll<HTMLElement>("[data-frame]")];
  const show = (row: HTMLElement) => {
    const name = row.dataset.frame!;
    const f = FRAMES[name];
    if (!f) return;
    rows.forEach((r) => r.classList.toggle("is-shown", r === row));
    img.srcset = `/img/twin/${name}-800.webp 800w, /img/twin/${name}-1600.webp 1600w`;
    img.src = `/img/twin/${name}-1600.webp`;
    img.alt = f.alt;
    caption.textContent = f.caption;
  };
  for (const row of rows) {
    row.addEventListener("mouseenter", () => show(row));
    row.addEventListener("focus", () => show(row));
    row.addEventListener("click", () => show(row));
  }
  // Warm the cache so switching is instant.
  for (const name of Object.keys(FRAMES)) new Image().src = `/img/twin/${name}-800.webp`;
}
