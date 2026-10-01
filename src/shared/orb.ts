import "../styles/orb.css";

/** A glowing orb that drifts while idle and quickens (add `is-thinking`) while Axis works. */
export function makeOrb(size: number): HTMLElement {
  const orb = document.createElement("span");
  orb.className = "orb";
  orb.style.setProperty("--orb", `${size}px`);
  orb.setAttribute("aria-hidden", "true");
  orb.innerHTML = '<span class="orb__a"></span><span class="orb__b"></span><span class="orb__c"></span><span class="orb__s"></span>';
  return orb;
}

/** Three small orbs bobbing in turn: the "thinking" indicator. Unlabelled, it's decoration beside visible text. */
export function orbDots(label?: string): HTMLElement {
  const dots = document.createElement("span");
  dots.className = "orb-dots";
  if (label) {
    dots.setAttribute("role", "img");
    dots.setAttribute("aria-label", label);
  } else dots.setAttribute("aria-hidden", "true");
  dots.innerHTML = "<span></span><span></span><span></span>";
  return dots;
}
