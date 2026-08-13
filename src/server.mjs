import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createStore } from "./store.mjs";

const MAX_BODY_BYTES = 1_000_000;
const DEMO_ASSETS = new Map([
  ["/demo", [new URL("../demo/index.html", import.meta.url), "text/html; charset=utf-8"]],
  ["/demo/", [new URL("../demo/index.html", import.meta.url), "text/html; charset=utf-8"]],
  ["/demo/styles.css", [new URL("../demo/styles.css", import.meta.url), "text/css; charset=utf-8"]],
  ["/demo/app.js", [new URL("../demo/app.js", import.meta.url), "text/javascript; charset=utf-8"]]
]);

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
}

async function sendDemoAsset(response, pathname) {
  const asset = DEMO_ASSETS.get(pathname);
  if (!asset) return false;
  const [fileUrl, contentType] = asset;
  const body = await readFile(fileUrl);
  response.writeHead(200, {
    "content-type": contentType,
    "content-length": body.length,
    "cache-control": "no-store"
  });
  response.end(body);
  return true;
}

async function readJson(request) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    const error = new Error("Request body must contain valid JSON");
    error.status = 400;
    throw error;
  }
}

function requireJsonContentType(request) {
  const mediaType = (request.headers["content-type"] || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (mediaType === "application/json" || mediaType.endsWith("+json")) return;

  const error = new Error("Content-Type must be application/json");
  error.status = 415;
  throw error;
}

function validateItem(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "Body must be a JSON object";
  if (typeof value.title !== "string" || value.title.trim().length < 1 || value.title.trim().length > 200) {
    return "title must be a non-empty string of at most 200 characters";
  }
  if (value.description !== undefined && typeof value.description !== "string") return "description must be a string";
  return null;
}

function parseItemId(pathname) {
  const match = pathname.match(/^\/items\/(\d+)$/);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function resolveRuntimeConfig(env = process.env) {
  const host = env.HOST?.trim() || "127.0.0.1";
  const databasePath = env.DB_PATH?.trim() || "data.sqlite";
  const port = Number(env.PORT || 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("PORT must be an integer from 1 to 65535");
  }

  return { host, port, databasePath };
}

export function installGracefulShutdown(server, {
  processTarget = process,
  timeoutMs = 10_000,
  log = console
} = {}) {
  let stopping = false;
  const handlers = new Map();

  const cleanup = () => {
    for (const [signal, handler] of handlers) processTarget.off(signal, handler);
    handlers.clear();
  };

  const shutdown = (signal) => {
    if (stopping) return;
    stopping = true;
    cleanup();
    log.info(`Received ${signal}; closing the HTTP server`);

    const forceTimer = setTimeout(() => {
      log.error("Graceful shutdown timed out");
      server.closeAllConnections?.();
      processTarget.exitCode = 1;
    }, timeoutMs);
    forceTimer.unref?.();

    server.close((error) => {
      clearTimeout(forceTimer);
      if (!error) return;
      log.error("Failed to close the HTTP server", error);
      processTarget.exitCode = 1;
    });
  };

  for (const signal of ["SIGINT", "SIGTERM"]) {
    const handler = () => shutdown(signal);
    handlers.set(signal, handler);
    processTarget.once(signal, handler);
  }

  return cleanup;
}

export function createApiServer({ store = createStore() } = {}) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const id = parseItemId(url.pathname);

      if (request.method === "GET" && await sendDemoAsset(response, url.pathname)) return;
      if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
      if (request.method === "GET" && url.pathname === "/items") return sendJson(response, 200, { items: store.list() });
      if (request.method === "GET" && id !== null) {
        const item = store.get(id);
        return item ? sendJson(response, 200, item) : sendJson(response, 404, { error: "Item not found" });
      }
      if (request.method === "POST" && url.pathname === "/items") {
        requireJsonContentType(request);
        const input = await readJson(request);
        const validationError = validateItem(input);
        if (validationError) return sendJson(response, 400, { error: validationError });
        return sendJson(response, 201, store.create({ title: input.title.trim(), description: input.description || "" }));
      }
      if (request.method === "PUT" && id !== null) {
        requireJsonContentType(request);
        const input = await readJson(request);
        const validationError = validateItem(input);
        if (validationError) return sendJson(response, 400, { error: validationError });
        const item = store.update(id, { title: input.title.trim(), description: input.description || "" });
        return item ? sendJson(response, 200, item) : sendJson(response, 404, { error: "Item not found" });
      }
      if (request.method === "DELETE" && id !== null) {
        return store.delete(id) ? sendJson(response, 200, { deleted: true }) : sendJson(response, 404, { error: "Item not found" });
      }
      return sendJson(response, 404, { error: "Route not found" });
    } catch (error) {
      return sendJson(response, error.status || 500, { error: error.status ? error.message : "Internal server error" });
    }
  });

  server.on("close", () => store.close());
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { host, port, databasePath } = resolveRuntimeConfig();
  const server = createApiServer({ store: createStore(databasePath) });
  installGracefulShutdown(server);
  server.listen(port, host, () => console.log(`SQLite CRUD API listening on http://${host}:${port}`));
}
