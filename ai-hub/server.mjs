#!/usr/bin/env node
// AI Hub: a local web app that talks to the AIs you subscribe to through their
// official CLIs. Runs only on your own computer (127.0.0.1). No dependencies.
//
//   node server.mjs            then open http://localhost:4317

import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

import { resolveProviders, checkProvider, runProvider, BILLING_ENV_VARS } from "./lib/providers.mjs";
import { resolveStudios } from "./lib/studios.mjs";
import { buildChatPrompt, buildRelayPrompt, buildStudioPrompt } from "./lib/prompts.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));

export function createHub({
  configPath = process.env.AI_HUB_CONFIG ?? join(ROOT, "hub.config.json"),
  dataDir = process.env.AI_HUB_DATA ?? join(ROOT, "data"),
  workspaceDir = process.env.AI_HUB_WORKSPACE ?? join(ROOT, "workspace"),
} = {}) {
  const config = existsSync(configPath) ? JSON.parse(readFileSync(configPath, "utf8")) : {};
  const providers = resolveProviders(config.providers);
  const studios = resolveStudios(config.studios);
  const convDir = join(dataDir, "conversations");
  mkdirSync(convDir, { recursive: true });
  mkdirSync(workspaceDir, { recursive: true });

  // Used by the Mac app to shut the background server down once you close it.
  let lastSeen = Date.now();
  let activeRuns = 0;

  let statusCache = null;
  let statusAt = 0;
  async function getStatus(refresh) {
    if (!refresh && statusCache && Date.now() - statusAt < 60_000) return statusCache;
    const entries = await Promise.all(
      Object.values(providers).map(async (p) => [p.id, await checkProvider(p)]),
    );
    statusCache = {
      providers: Object.fromEntries(entries),
      strippedEnvVars: BILLING_ENV_VARS.filter((k) => process.env[k]),
    };
    statusAt = Date.now();
    return statusCache;
  }

  function publicConfig() {
    return {
      providers: Object.values(providers).map(({ id, name, color, subscription, install, login, models }) => ({
        id, name, color, subscription, install, login, models: models ?? [],
      })),
      studios,
    };
  }

  function promptFor(body) {
    const names = Object.fromEntries(Object.values(providers).map((p) => [p.id, p.name]));
    switch (body.kind) {
      case "chat":
        return buildChatPrompt(body.history ?? [], body.message ?? "", names);
      case "relay":
        return buildRelayPrompt(body);
      case "studio": {
        const studio = studios.find((s) => s.id === body.studio);
        if (!studio) throw httpError(400, "Unknown studio");
        return buildStudioPrompt({ ...body, studio });
      }
      default:
        throw httpError(400, "Unknown kind");
    }
  }

  async function handleRun(req, res) {
    const body = await readJson(req);
    const p = providers[body.provider];
    if (!p) throw httpError(400, `Unknown provider "${body.provider}"`);
    const prompt = promptFor(body);
    if (!prompt.trim()) throw httpError(400, "Empty prompt");

    activeRuns++;
    res.on("close", () => activeRuns--);
    res.writeHead(200, { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" });
    const send = (obj) => res.writableEnded || res.write(JSON.stringify(obj) + "\n");
    const run = runProvider(p, prompt, {
      cwd: workspaceDir,
      model: body.model || undefined,
      onChunk: (text) => send({ type: "chunk", text }),
    });
    // Stop the CLI if the browser goes away or presses Stop.
    res.on("close", () => !res.writableFinished && run.cancel());
    try {
      const result = await run.promise;
      send({ type: "done", text: result.text, cancelled: !!result.cancelled });
    } catch (err) {
      send({ type: "error", message: err.message });
    }
    res.end();
  }

  const convPath = (id) => {
    if (!/^[\w-]{1,64}$/.test(id)) throw httpError(400, "Bad id");
    return join(convDir, `${id}.json`);
  };

  function listConversations() {
    return readdirSync(convDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          const c = JSON.parse(readFileSync(join(convDir, f), "utf8"));
          return { id: c.id, title: c.title, mode: c.mode, updatedAt: c.updatedAt };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }

  async function route(req, res) {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;

    if (path === "/api/config" && req.method === "GET") return json(res, publicConfig());
    if (path === "/api/ping" && req.method === "GET") return json(res, { ok: true });
    if (path === "/api/status" && req.method === "GET") return json(res, await getStatus(url.searchParams.has("refresh")));
    if (path === "/api/run" && req.method === "POST") return handleRun(req, res);

    if (path === "/api/conversations" && req.method === "GET") return json(res, listConversations());
    if (path === "/api/conversations" && req.method === "POST") {
      const body = await readJson(req);
      const conv = { id: body.id || randomUUID(), title: body.title || "Untitled", mode: body.mode || "chat", messages: body.messages ?? [], updatedAt: new Date().toISOString() };
      writeFileSync(convPath(conv.id), JSON.stringify(conv, null, 2));
      return json(res, conv);
    }
    const m = path.match(/^\/api\/conversations\/([\w-]+)$/);
    if (m && req.method === "GET") {
      const file = convPath(m[1]);
      if (!existsSync(file)) throw httpError(404, "Not found");
      return json(res, JSON.parse(readFileSync(file, "utf8")));
    }
    if (m && req.method === "DELETE") {
      rmSync(convPath(m[1]), { force: true });
      return json(res, { ok: true });
    }

    if (req.method === "GET" && !path.startsWith("/api/")) return serveStatic(path, res);
    throw httpError(404, "Not found");
  }

  async function handler(req, res) {
    lastSeen = Date.now();
    try {
      // Only answer requests for this machine, from this app. This blocks other
      // websites (and DNS-rebinding tricks) from driving your AIs.
      const host = (req.headers.host ?? "").replace(/:\d+$/, "");
      if (!["localhost", "127.0.0.1", "[::1]"].includes(host)) throw httpError(403, "Forbidden host");
      if (req.method !== "GET") {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw httpError(403, "Forbidden origin");
        if (!(req.headers["content-type"] ?? "").startsWith("application/json")) throw httpError(415, "JSON only");
      }
      await route(req, res);
    } catch (err) {
      if (res.headersSent) return res.end();
      json(res, { error: err.message }, err.status ?? 500);
    }
  }
  handler.idleMs = () => (activeRuns > 0 ? 0 : Date.now() - lastSeen);
  return handler;
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml" };

function serveStatic(path, res) {
  const rel = path === "/" ? "index.html" : path.slice(1);
  if (rel.includes("..") || !/^[\w./-]+$/.test(rel)) throw httpError(404, "Not found");
  const file = join(ROOT, "public", rel);
  if (!existsSync(file)) throw httpError(404, "Not found");
  res.writeHead(200, {
    "content-type": MIME[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-cache",
    "content-security-policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:",
  });
  res.end(readFileSync(file));
}

function json(res, obj, status = 200) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

function readJson(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(httpError(413, "Too large"));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(httpError(400, "Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT ?? 4317);
  const hub = createHub();
  const server = createServer(hub);
  // The Mac app starts the hub in the background and sets this, so it quits by
  // itself a few minutes after the last window closes (open pages ping it).
  const idleMin = Number(process.env.AI_HUB_IDLE_EXIT_MIN ?? 0);
  if (idleMin > 0) {
    setInterval(() => hub.idleMs() > idleMin * 60_000 && process.exit(0), 30_000).unref();
  }
  server.listen(port, "127.0.0.1", () => {
    console.log(`\n  AI Hub is running:  http://localhost:${port}\n`);
    const set = BILLING_ENV_VARS.filter((k) => process.env[k]);
    if (set.length) {
      console.log(`  Note: ${set.join(", ")} ${set.length > 1 ? "are" : "is"} set in your shell. The hub removes`);
      console.log("  them for the AIs it starts, so they use your subscriptions, not paid API keys.\n");
    }
  });
}
