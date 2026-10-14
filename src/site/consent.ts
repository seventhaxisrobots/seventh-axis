import { SITE } from "./config.ts";

// Cookie and analytics consent. Nothing optional loads until the visitor says
// yes, and both choices are one click away with equal weight.

const KEY = "sa_consent";
const VERSION = 1;

interface Consent {
  v: number;
  analytics: boolean;
  at: string;
}

export function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Consent) : null;
    return parsed?.v === VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: VERSION, analytics, at: new Date().toISOString() }));
  } catch {
    // Private mode or blocked storage: the choice applies to this page view only.
  }
}

function applyConsent(analytics: boolean): void {
  if (!analytics || SITE.analytics !== "vercel" || document.querySelector("script[data-analytics]")) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  script.dataset.analytics = "vercel";
  document.head.append(script);
}

let banner: HTMLElement | null = null;

function showBanner(): void {
  banner?.remove();
  const current = readConsent();
  banner = document.createElement("section");
  banner.className = "consent";
  banner.setAttribute("aria-label", "Cookie preferences");
  banner.innerHTML = `
    <p><strong>Cookies.</strong> We store only what the site needs. With your permission we'd also count visits, anonymously. No ads. <a class="consent__link" href="/cookies">Cookie policy</a></p>
    <div class="consent__actions">
      <button type="button" class="btn btn--outline btn--small" data-choice="essential">Essential only</button>
      <button type="button" class="btn btn--primary btn--small" data-choice="all">Accept all</button>
    </div>`;
  if (current) {
    const note = document.createElement("p");
    note.textContent = `Your current choice: ${current.analytics ? "all cookies accepted" : "essential only"}.`;
    banner.querySelector("p")!.after(note);
  }
  banner.addEventListener("click", (e) => {
    const choice = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-choice]")?.dataset.choice;
    if (!choice) return;
    const analytics = choice === "all";
    const hadAnalytics = readConsent()?.analytics ?? false;
    saveConsent(analytics);
    banner?.remove();
    banner = null;
    // Withdrawing consent stops analytics from the next page load.
    if (hadAnalytics && !analytics) location.reload();
    else applyConsent(analytics);
  });
  document.body.append(banner);
}

export function initConsent(): void {
  const consent = readConsent();
  if (consent) applyConsent(consent.analytics);
  // On the home page the banner waits for the opening to finish, so the first screen isn't crowded.
  else if (document.querySelector("[data-intro]") && !document.documentElement.classList.contains("intro-seen")) {
    const wait = new MutationObserver(() => {
      if (!document.documentElement.classList.contains("intro-seen")) return;
      wait.disconnect();
      setTimeout(showBanner, 1500);
    });
    wait.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  } else setTimeout(showBanner, 1200);

  document.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-cookie-settings]")) {
      e.preventDefault();
      showBanner();
    }
  });
}
