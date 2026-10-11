import { initSite } from "../site/site.ts";
import "../styles/docs.css";

initSite();

// Copy buttons on code blocks.
for (const btn of document.querySelectorAll<HTMLButtonElement>("[data-copy]")) {
  btn.addEventListener("click", async () => {
    const code = btn.closest("[data-code]")?.querySelector("code")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(code);
      btn.textContent = "Copied";
    } catch {
      btn.textContent = "Select and copy";
    }
    setTimeout(() => (btn.textContent = "Copy"), 1600);
  });
}

// Search: hide sections (and their sidebar links) that don't mention the query.
const search = document.querySelector<HTMLInputElement>("[data-docs-search]");
const sections = [...document.querySelectorAll<HTMLElement>("[data-doc]")];
const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-docs-nav] a")];
const empty = document.querySelector<HTMLElement>("[data-docs-empty]");
const linkFor = (id: string) => links.find((a) => a.hash === `#${id}`);

search?.addEventListener("input", () => {
  const q = search.value.trim().toLowerCase();
  let shown = 0;
  for (const s of sections) {
    const hit = !q || (s.textContent ?? "").toLowerCase().includes(q);
    s.hidden = !hit;
    linkFor(s.id)?.toggleAttribute("hidden", !hit);
    if (hit) shown++;
  }
  if (empty) empty.hidden = shown > 0;
});

document.addEventListener("keydown", (e) => {
  const typing = (e.target as HTMLElement).closest("input, textarea, select, [contenteditable]");
  if (e.key === "/" && !typing && search) {
    e.preventDefault();
    search.focus();
  }
});

// Highlight the section in view.
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        links.forEach((a) => a.classList.toggle("is-current", a.hash === `#${e.target.id}`));
      }
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  sections.forEach((s) => io.observe(s));
}
