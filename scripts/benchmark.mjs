import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { createStore } from "../src/store.mjs";
import { createApiServer } from "../src/server.mjs";

function resolveRequestCount(env = process.env) {
  const value = Number(env.BENCHMARK_REQUESTS || 200);
  if (!Number.isInteger(value) || value < 1 || value > 5_000) {
    throw new Error("BENCHMARK_REQUESTS must be an integer from 1 to 5000");
  }
  return value;
}

function resolveRunCount(env = process.env) {
  const value = Number(env.BENCHMARK_RUNS || 5);
  if (!Number.isInteger(value) || value < 1 || value > 20) {
    throw new Error("BENCHMARK_RUNS must be an integer from 1 to 20");
  }
  return value;
}

function resolveDatabaseMode(env = process.env) {
  const value = (env.BENCHMARK_DATABASE || "memory").trim().toLowerCase();
  if (value !== "memory" && value !== "file") {
    throw new Error("BENCHMARK_DATABASE must be memory or file");
  }
  return value;
}

async function createItem(baseUrl, index) {
  const response = await fetch(`${baseUrl}/items`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: `Benchmark item ${index}` })
  });
  if (response.status !== 201) {
    throw new Error(`POST /items returned ${response.status}: ${await response.text()}`);
  }
}

async function runPhase(mode, requestCount, databaseMode) {
  const temporaryDirectory = databaseMode === "file"
    ? await mkdtemp(join(tmpdir(), "sqlite-crud-benchmark-"))
    : null;
  const databasePath = temporaryDirectory
    ? join(temporaryDirectory, "benchmark.sqlite")
    : ":memory:";
  const server = createApiServer({ store: createStore(databasePath) });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const startedAt = performance.now();
    if (mode === "sequential") {
      for (let index = 0; index < requestCount; index += 1) {
        await createItem(baseUrl, index);
      }
    } else {
      await Promise.all(
        Array.from({ length: requestCount }, (_, index) => createItem(baseUrl, index))
      );
    }
    const durationMs = performance.now() - startedAt;
    const listResponse = await fetch(`${baseUrl}/items`);
    const { items } = await listResponse.json();

    return {
      mode,
      requests: requestCount,
      successful: items.length,
      durationMs: Number(durationMs.toFixed(2)),
      requestsPerSecond: Number((requestCount / (durationMs / 1_000)).toFixed(2))
    };
  } finally {
    server.close();
    await once(server, "close");
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

const requestCount = resolveRequestCount();
const runCount = resolveRunCount();
const databaseMode = resolveDatabaseMode();
const samples = [];

await runPhase("sequential", Math.min(requestCount, 25), databaseMode);
await runPhase("concurrent", Math.min(requestCount, 25), databaseMode);

for (let run = 1; run <= runCount; run += 1) {
  const modes = run % 2 === 1
    ? ["sequential", "concurrent"]
    : ["concurrent", "sequential"];
  for (const mode of modes) {
    samples.push({ run, ...await runPhase(mode, requestCount, databaseMode) });
  }
}

const summary = ["sequential", "concurrent"].map((mode) => {
  const matching = samples.filter((sample) => sample.mode === mode);
  return {
    mode,
    runs: matching.length,
    requestsPerRun: requestCount,
    successfulPerRun: Math.min(...matching.map((sample) => sample.successful)),
    medianDurationMs: Number(median(matching.map((sample) => sample.durationMs)).toFixed(2)),
    medianRequestsPerSecond: Number(median(matching.map((sample) => sample.requestsPerSecond)).toFixed(2))
  };
});

console.log(JSON.stringify({
  node: process.version,
  database: databaseMode === "file" ? "SQLite temporary file" : "SQLite :memory:",
  operation: "POST /items",
  note: "Local microbenchmark; not a production capacity test",
  summary,
  samples
}, null, 2));
