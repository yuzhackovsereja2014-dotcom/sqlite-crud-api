import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createStore } from "../src/store.mjs";
import { createApiServer } from "../src/server.mjs";

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
