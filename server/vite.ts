import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export async function setupVite(server: Server, app: Express) {
  const serverOptions = {
    // Preserve fs.allow from viteConfig so @shared alias isn't blocked
    ...(viteConfig.server ?? {}),
    middlewareMode: true,
    hmr: { server, path: "/vite-hmr" },
    allowedHosts: "all" as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      // Don't kill the server on non-fatal Vite errors
      error: (msg, options) => {
        viteLogger.error(msg, options);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Serve index.html for all non-API routes.
  // transformIndexHtml is required so @vitejs/plugin-react can inject its
  // Fast Refresh preamble — without it the app fails to mount.
  app.use("/{*path}", async (req, res, next) => {
    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // Cache-bust the entry module so HMR stays fresh
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      // Let Vite inject the React Fast Refresh preamble and other transforms
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      // Vite stack traces show in the browser overlay — pass through
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
