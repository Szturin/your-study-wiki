import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out");
const prefix = "/your-study-wiki";
const port = Number(process.argv[2] || 3096);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".enc": "application/octet-stream" };

if (!existsSync(path.join(root, "index.html")) || !existsSync(path.join(root, "protected", "manifest.json"))) {
  throw new Error("Local static build is missing. Run NEXT_PUBLIC_BASE_PATH=/your-study-wiki npm run build first.");
}

createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname); }
  catch { response.writeHead(400).end(); return; }
  if (pathname === "/" || pathname === prefix) {
    response.writeHead(302, { Location: `${prefix}/`, "Cache-Control": "no-store" }).end(); return;
  }
  if (!pathname.startsWith(`${prefix}/`) || pathname.startsWith(`${prefix}/843/`)) {
    response.writeHead(404).end(); return;
  }
  const relative = pathname.slice(prefix.length + 1) || "index.html";
  const file = path.resolve(root, relative);
  const withinRoot = path.relative(root, file);
  if (withinRoot.startsWith("..") || path.isAbsolute(withinRoot) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end(); return;
  }
  response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (request.method === "HEAD") { response.end(); return; }
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`843 local wall ready at http://localhost:${port}${prefix}/`));
