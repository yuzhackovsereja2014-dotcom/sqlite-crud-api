import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { createStore } from "../src/store.mjs";
import { createApiServer, installGracefulShutdown, resolveRuntimeConfig } from "../src/server.mjs";

async function withApi(run) {
  const server = createApiServer({ store: createStore(":memory:") });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("health endpoint reports readiness", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  });
});

test("resolves and validates runtime configuration", () => {
  assert.deepEqual(resolveRuntimeConfig({}), {
    host: "127.0.0.1",
    port: 3000,
    databasePath: "data.sqlite"
  });
  assert.deepEqual(resolveRuntimeConfig({
    HOST: "0.0.0.0",
    PORT: "8080",
    DB_PATH: "/data/items.sqlite"
  }), {
    host: "0.0.0.0",
    port: 8080,
    databasePath: "/data/items.sqlite"
  });
  assert.throws(
    () => resolveRuntimeConfig({ PORT: "70000" }),
    /PORT must be an integer from 1 to 65535/
  );
});

test("graceful shutdown closes once and removes signal listeners", () => {
  const processTarget = new EventEmitter();
  processTarget.exitCode = undefined;
  let closeCalls = 0;
  const server = {
    close(callback) {
      closeCalls += 1;
      callback();
    }
  };
  const messages = [];
  const log = {
    info: (message) => messages.push(message),
    error: (message) => messages.push(message)
  };

  installGracefulShutdown(server, { processTarget, timeoutMs: 50, log });
  assert.equal(processTarget.listenerCount("SIGINT"), 1);
  assert.equal(processTarget.listenerCount("SIGTERM"), 1);

  processTarget.emit("SIGTERM");
  processTarget.emit("SIGINT");

  assert.equal(closeCalls, 1);
  assert.equal(processTarget.listenerCount("SIGINT"), 0);
  assert.equal(processTarget.listenerCount("SIGTERM"), 0);
  assert.equal(processTarget.exitCode, undefined);
  assert.deepEqual(messages, ["Received SIGTERM; closing the HTTP server"]);
});

test("serves the local API explorer", async () => {
  await withApi(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/demo`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /^text\/html/);
    assert.match(await response.text(), /SQLite CRUD API/);
  });
});

test("supports create, list, read, update, and delete", async () => {
  await withApi(async (baseUrl) => {
    const createdResponse = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "First", description: "Demo" })
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json();
    assert.equal(created.title, "First");

    const list = await (await fetch(`${baseUrl}/items`)).json();
    assert.equal(list.items.length, 1);

    const found = await (await fetch(`${baseUrl}/items/${created.id}`)).json();
    assert.equal(found.description, "Demo");

    const updatedResponse = await fetch(`${baseUrl}/items/${created.id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Updated" })
    });
    assert.equal(updatedResponse.status, 200);
    assert.equal((await updatedResponse.json()).title, "Updated");

    assert.equal((await fetch(`${baseUrl}/items/${created.id}`, { method: "DELETE" })).status, 200);
    assert.equal((await fetch(`${baseUrl}/items/${created.id}`)).status, 404);
  });
});

test("rejects invalid JSON and invalid item data", async () => {
  await withApi(async (baseUrl) => {
    const invalidJson = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{"
    });
    assert.equal(invalidJson.status, 400);

    const invalidItem = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: " " })
    });
    assert.equal(invalidItem.status, 400);
  });
});

test("requires JSON content type and enforces the request body limit", async () => {
  await withApi(async (baseUrl) => {
    const wrongContentType = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ title: "Not JSON media type" })
    });
    assert.equal(wrongContentType.status, 415);
    assert.deepEqual(await wrongContentType.json(), {
      error: "Content-Type must be application/json"
    });

    const oversizedBody = await fetch(`${baseUrl}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Large", description: "x".repeat(1_000_000) })
    });
    assert.equal(oversizedBody.status, 413);
    assert.deepEqual(await oversizedBody.json(), {
      error: "Request body is too large"
    });
  });
});
