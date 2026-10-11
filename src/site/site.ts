import "../styles/base.css";
import "../styles/site.css";
import "../styles/kit.css";
import { SITE } from "./config.ts";
import { initAskAxis } from "./ask.ts";
import { initMedia } from "./media.ts";
import { initConsent } from "./consent.ts";
import { initReeded } from "./reeded.ts";

function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const menu = document.getElementById("mobile-menu");
  if (!header) return;

  // Over a full-bleed hero the header stays transparent until the hero scrolls away.
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const limit = () => (hero ? hero.offsetHeight - header.offsetHeight : 8);
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > limit() || (menu !== null && !menu.hidden));
    // Still over the dark hero, but scrolled: a dark glass bar keeps the links readable.
    header.classList.toggle("is-floating", window.scrollY > 24);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  if (toggle && menu) {
    const setOpen = (open: boolean) => {
      toggle.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      document.body.classList.toggle("menu-open", open);
      onScroll();
    };
    toggle.addEventListener("click", () => setOpen(Boolean(menu.hidden)));
    menu.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) {
        setOpen(false);
        toggle.focus();
      }
    });
  }
}

function fillContactDetails(): void {
  document.querySelectorAll<HTMLAnchorElement>("a[data-contact-email]").forEach((a) => {
    a.href = `mailto:${SITE.contactEmail}`;
    if (!a.textContent?.trim() || a.dataset.contactEmail === "show") a.textContent = SITE.contactEmail;
  });
  document.querySelectorAll<HTMLElement>("[data-legal-entity]").forEach((el) => (el.textContent = SITE.legalEntity));
}

function markCurrentPage(): void {
  const path = location.pathname.replace(/\.html$/, "").replace(/\/$/, "") || "/";
  document.querySelectorAll<HTMLAnchorElement>(".site-nav a, .mobile-menu a").forEach((a) => {
    if (a.getAttribute("href") === path) a.setAttribute("aria-current", "page");
  });
}

// Sections fade up as they scroll into view; reduced motion shows them at once.
function initReveal(): void {
  const els = [...document.querySelectorAll<HTMLElement>(".reveal")];
  if (!els.length || matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add("is-in");
        seen.unobserve(e.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  document.documentElement.classList.add("reveal-on");
  els.forEach((el) => seen.observe(el));
}

export function initSite(): void {
  initHeader();
  initReeded();
  initReveal();
  markCurrentPage();
  fillContactDetails();
  initConsent();
  initAskAxis();
  initMedia();
}
