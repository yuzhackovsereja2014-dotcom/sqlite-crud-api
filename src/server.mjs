import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { createStore } from "./store.mjs";

const MAX_BODY_BYTES = 1_000_000;

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  response.end(body);
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

export function createApiServer({ store = createStore() } = {}) {
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      const id = parseItemId(url.pathname);

      if (request.method === "GET" && url.pathname === "/health") return sendJson(response, 200, { status: "ok" });
      if (request.method === "GET" && url.pathname === "/items") return sendJson(response, 200, { items: store.list() });
      if (request.method === "GET" && id !== null) {
        const item = store.get(id);
        return item ? sendJson(response, 200, item) : sendJson(response, 404, { error: "Item not found" });
      }
      if (request.method === "POST" && url.pathname === "/items") {
        const input = await readJson(request);
        const validationError = validateItem(input);
        if (validationError) return sendJson(response, 400, { error: validationError });
        return sendJson(response, 201, store.create({ title: input.title.trim(), description: input.description || "" }));
      }
      if (request.method === "PUT" && id !== null) {
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
  const port = Number(process.env.PORT || 3000);
  const server = createApiServer();
  server.listen(port, "127.0.0.1", () => console.log(`SQLite CRUD API listening on http://127.0.0.1:${port}`));
}
