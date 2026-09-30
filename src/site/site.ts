import "../styles/base.css";
import "../styles/site.css";
import { SITE } from "./config.ts";
import { initConsent } from "./consent.ts";

function initHeader(): void {
  const header = document.querySelector<HTMLElement>("[data-header]");
  const toggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
  const menu = document.getElementById("mobile-menu");
  if (!header) return;

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && menu) {
    const setOpen = (open: boolean) => {
      toggle.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      document.body.classList.toggle("menu-open", open);
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

export function initSite(): void {
  initHeader();
  fillContactDetails();
  initConsent();
}
