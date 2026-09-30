import "../styles/base.css";
import "../styles/site.css";
import { SITE } from "./config.ts";
import { initAskAxis } from "./ask.ts";
import { initConsent } from "./consent.ts";

function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const menu = document.getElementById("mobile-menu");
  if (!header) return;

  // Over a full-bleed hero the header stays transparent until the hero scrolls away.
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  const limit = () => (hero ? hero.offsetHeight - header.offsetHeight : 8);
  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > limit() || (menu !== null && !menu.hidden));
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

export function initSite(): void {
  initHeader();
  markCurrentPage();
  fillContactDetails();
  initConsent();
  initAskAxis();
}
