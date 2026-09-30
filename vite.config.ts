import { defineConfig, loadEnv, type Plugin } from "vite";
import { resolve } from "node:path";
import type { IncomingMessage } from "node:http";

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
    plugins: [localApi()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), "index.html"),
          studio: resolve(process.cwd(), "studio.html"),
        },
      },
    },
  };
});
