import { config } from "./config.ts";
import app from "./app.ts";

console.log(`Starting server on ${config.server.host}:${config.server.port}`);

const frontendDist = new URL("../../frontend/dist/", import.meta.url);

function withApiAndStatic(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api")) {
    return app.fetch(req);
  }

  const pathname = decodeURIComponent(url.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  if (relativePath.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const file = Bun.file(new URL(relativePath, frontendDist));
  return file.exists().then((exists: boolean) => {
    if (exists) return new Response(file);
    return new Response(Bun.file(new URL("index.html", frontendDist)));
  });
}

Bun.serve({
  hostname: config.server.host,
  port: config.server.port,
  fetch: withApiAndStatic,
});

console.log(`Server running at http://${config.server.host}:${config.server.port}`);
