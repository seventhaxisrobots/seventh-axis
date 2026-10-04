import { defineConfig, loadEnv, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import type { IncomingMessage } from "node:http";
import { PAGE_SEO, SITE_NAME, SITE_URL } from "./seo.ts";
import { FAQ, PRICING } from "./src/shared/knowledge.ts";
import { arrChart, cashChart, fundsBars, marketBars, plTable, roundsTable, sensitivityTable } from "./src/investors/render.ts";

const PAGES = ["index", "product", "industries", "roi", "pricing", "pilot", "studio", "book", "about", "safety", "privacy", "cookies", "terms", "404", "app", "investors"];

// Serves the Vercel functions in /api during `npm run dev`, so the whole
// product runs locally without the Vercel CLI.
function localApi(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        const match = url.pathname.match(/^\/api\/([a-z-]+)$/);
        if (!match) return next();

        try {
          const mod = await server.ssrLoadModule(`/api/${match[1]}.ts`);
          const method = req.method ?? "GET";
          const handler = mod[method] as ((r: Request) => Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }

          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (typeof value === "string") headers.set(key, value);
            else if (Array.isArray(value)) headers.set(key, value.join(", "));
          }
          if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", req.socket.remoteAddress ?? "127.0.0.1");

          const hasBody = method !== "GET" && method !== "HEAD";
          const response = await handler(
            new Request(url, { method, headers, body: hasBody ? new Uint8Array(await readBody(req)) : undefined }),
          );

          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          next(err);
        }
      });
    },
  };
}

// Lets pages share markup: <!--#header--> pulls in partials/header.html.
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Markup rendered from src/shared/knowledge.ts, so the pages and Ask Axis always agree.
const GENERATED: Record<string, () => string> = {
  "pricing-cards": () =>
    PRICING.map(
      (p) => `<article class="plan${p.featured ? " plan--featured" : ""}">
          <h2 class="plan__name">${esc(p.name)}</h2>
          <p class="plan__price">${esc(p.price)}</p>
          <p class="plan__cadence">${esc(p.cadence)}</p>
          <p class="plan__summary">${esc(p.summary)}</p>
          <ul class="plan__features">${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
          <a class="btn ${p.featured ? "btn--signal" : "btn--primary"} plan__cta" href="${p.cta.href}">${esc(p.cta.label)}</a>
        </article>`,
    ).join("\n        "),
  "hero-prices": () =>
    PRICING.filter((p) => p.price.startsWith("RM"))
      .map((p) => `<div><strong>${esc(p.price)}</strong>${esc(p.cadence)}</div>`)
      .join(""),
  faq: () =>
    FAQ.map((f) => `<details class="faq__item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n          "),
  "investor-arr": arrChart,
  "investor-cash": cashChart,
  "investor-pl": plTable,
  "investor-market": marketBars,
  "investor-funds": fundsBars,
  "investor-rounds": roundsTable,
  "investor-sensitivities": sensitivityTable,
};

function partials(): Plugin {
  return {
    name: "html-partials",
    transformIndexHtml: {
      order: "pre",
      handler: (html) =>
        html.replace(/<!--#([a-z-]+)-->/g, (_, name: string) =>
          GENERATED[name]?.() ?? readFileSync(resolve(process.cwd(), "partials", `${name}.html`), "utf8"),
        ),
    },
  };
}

const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Canonical URLs, complete share tags and structured data for each page, plus the sitemap.
function seo(): Plugin {
  return {
    name: "seo",
    transformIndexHtml(html, ctx) {
      const page = PAGE_SEO[basename(ctx.filename, ".html")];
      if (!page) return html;
      const pick = (re: RegExp) => html.match(re)?.[1];
      const title = pick(/<title>([^<]*)<\/title>/) ?? SITE_NAME;
      const description = pick(/<meta name="description" content="([^"]*)"/) ?? "";
      const ogTitle = pick(/<meta property="og:title" content="([^"]*)"/) ?? title;
      const ogDescription = pick(/<meta property="og:description" content="([^"]*)"/) ?? description;
      const url = `${SITE_URL}${page.path}`;
      const image = `${SITE_URL}${page.image ?? "/og.png"}`;

      const tags = [
        page.noindex ? `<meta name="robots" content="noindex" />` : `<link rel="canonical" href="${url}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${SITE_NAME}" />`,
        `<meta property="og:locale" content="en_MY" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${ogTitle}" />`,
        `<meta property="og:description" content="${ogDescription}" />`,
        `<meta property="og:image" content="${image}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="${attr(ogTitle)}" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        `<meta name="twitter:title" content="${ogTitle}" />`,
        `<meta name="twitter:description" content="${ogDescription}" />`,
        `<meta name="twitter:image" content="${image}" />`,
        ...(page.jsonLd ?? []).map(
          (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\u003c")}</script>`,
        ),
      ];
      return html
        .replace(/\s*<meta (?:property="og:[^"]*"|name="twitter:[^"]*")[^>]*>/g, "")
        .replace("</head>", `    ${tags.join("\n    ")}\n  </head>`);
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      const urls = Object.values(PAGE_SEO)
        .filter((p) => !p.noindex)
        .map(
          (p) =>
            `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod><priority>${(p.priority ?? 0.5).toFixed(1)}</priority></url>`,
        );
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`,
      });
    },
  };
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", fail);
  });
}

export default defineConfig(({ mode }) => {
  // Make .env.local visible to the API handlers in dev, like Vercel does in production.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    plugins: [partials(), seo(), localApi()],
    build: {
      // three.js makes the Studio bundle large; it loads only on /studio.
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        input: Object.fromEntries(PAGES.map((p) => [p, resolve(process.cwd(), `${p}.html`)])),
      },
    },
  };
});
