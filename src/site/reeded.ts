// Reeded glass, the site's visual motif (it comes from the founder portrait).
// Any element marked [data-reeded] that holds an <img> gets a pane of fluted
// glass over part of the picture: a copy of the image, displaced rib by rib
// with an SVG filter, so the photo really refracts rather than being striped.
//
//   data-reeded="left" | "right"   which side the glass covers (default left)
//   style="--reed-w: 44%"          how much of the picture it covers

const RIB = 18; // px per rib
const RAMP =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAECAIAAACxwq7zAAAAQElEQVR42u2PywoAIAgEx56/3ad3CGUJOkfQMsiedDTGAAyABAbJyUIRqtB8bvRzUWJDoIdUIKyWoTq/nf/A7UyxPAIHXW/n5AAAAABJRU5ErkJggg==";

function defineFilter(): void {
  if (document.getElementById("reeded-glass")) return;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.innerHTML = `
    <filter id="reeded-glass" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feImage href="${RAMP}" x="0" y="0" width="${RIB}" height="${RIB}" preserveAspectRatio="none" result="rib" />
      <feTile in="rib" result="ribs" />
      <feDisplacementMap in="SourceGraphic" in2="ribs" scale="34" xChannelSelector="R" yChannelSelector="G" />
    </filter>`;
  document.body.prepend(svg);
}

export function initReeded(): void {
  const hosts = [...document.querySelectorAll<HTMLElement>("[data-reeded]")];
  if (!hosts.length) return;
  defineFilter();
  for (const host of hosts) {
    const img = host.querySelector("img");
    if (!img || host.querySelector(".reeded")) continue;
    const pane = document.createElement("div");
    pane.className = `reeded reeded--${host.dataset.reeded === "right" ? "right" : "left"}`;
    pane.setAttribute("aria-hidden", "true");
    const copy = img.cloneNode() as HTMLImageElement;
    copy.removeAttribute("fetchpriority");
    copy.alt = "";
    copy.style.objectPosition = getComputedStyle(img).objectPosition;
    pane.append(copy);
    img.after(pane);
  }
}
