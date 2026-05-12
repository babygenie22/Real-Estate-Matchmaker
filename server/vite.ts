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
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Serve index.html for all non-API routes; Vite middleware handles module transforms
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
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      next(e);
    }
  });
}
