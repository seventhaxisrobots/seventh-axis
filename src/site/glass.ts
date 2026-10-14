// Liquid glass, in the style Apple introduced in 2025: the panel bends what's
// behind it near its edges instead of just blurring it. It needs an SVG filter
// in backdrop-filter, which only Chromium supports, so it's switched on there
// (html.lg-on) and everything else keeps the plain translucent panel.

/** A displacement map for a rounded panel: neutral in the middle, pulling inward at the edges. */
function edgeMap(size = 256, band = 0.16): string {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      // Distance to the nearest edge, and which way is inward.
      const dx = u < 0.5 ? u : 1 - u;
      const dy = v < 0.5 ? v : 1 - v;
      const pullX = dx < band ? (1 - dx / band) ** 2 * (u < 0.5 ? 1 : -1) : 0;
      const pullY = dy < band ? (1 - dy / band) ** 2 * (v < 0.5 ? 1 : -1) : 0;
      const i = (y * size + x) * 4;
      img.data[i] = 128 + pullX * 127;
      img.data[i + 1] = 128 + pullY * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
}

export function initGlass(): void {
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? [];
  const chromium = brands.some((b) => /Chromium/i.test(b.brand));
  if (!chromium || !document.querySelector(".checklist--glass")) return;
  if (matchMedia("(prefers-reduced-transparency: reduce)").matches) return;

  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.innerHTML = `
    <filter id="liquid-glass" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" color-interpolation-filters="sRGB">
      <feImage href="${edgeMap()}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" result="map" />
      <feDisplacementMap in="SourceGraphic" in2="map" scale="0.07" xChannelSelector="R" yChannelSelector="G" />
    </filter>`;
  document.body.prepend(svg);
  document.documentElement.classList.add("lg-on");
}
