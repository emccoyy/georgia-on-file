import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createHub } from "../server.mjs";
import { buildChatPrompt } from "../lib/prompts.mjs";

const fake = join(dirname(fileURLToPath(import.meta.url)), "fake-cli.mjs");
let server, base, dir;

before(async () => {
  dir = mkdtempSync(join(tmpdir(), "hub-test-"));
  const configPath = join(dir, "hub.config.json");
  writeFileSync(
    configPath,
    JSON.stringify({
      providers: {
        claude: { command: process.execPath, args: [fake], statusCommand: ["--version"] },
        chatgpt: { command: process.execPath, args: [fake, "--fail"], statusCommand: ["--version"] },
        gemini: { command: process.execPath, args: [fake, "--mode", "plan", "--print", "{prompt}"], versionArgs: ["--version"] },
      },
    }),
  );
  process.env.ANTHROPIC_API_KEY = "sk-should-not-leak";
  server = createServer(createHub({ configPath, dataDir: join(dir, "data"), workspaceDir: join(dir, "ws") }));
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = `http://localhost:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.ANTHROPIC_API_KEY;
});

async function run(body) {
  const res = await fetch(`${base}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const events = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
  return { status: res.status, events };
}

test("config lists enabled providers and studios", async () => {
  const cfg = await (await fetch(`${base}/api/config`)).json();
  assert.deepEqual(cfg.providers.map((p) => p.id), ["claude", "chatgpt", "gemini"]);
  assert.ok(cfg.studios.some((s) => s.id === "sora"));
});

test("streams a reply and hides API keys from the CLI", async () => {
  const { events } = await run({ kind: "chat", provider: "claude", history: [], message: "hello hub" });
  assert.ok(events.filter((e) => e.type === "chunk").length >= 1);
  const done = events.at(-1);
  assert.equal(done.type, "done");
  assert.match(done.text, /ECHO: hello hub/);
  assert.match(done.text, /LEAKED: none/);
});

test("prompt-as-argument providers get the text as one safe argument", async () => {
  const { events } = await run({ kind: "chat", provider: "gemini", history: [], message: "--help; rm -rf ~ $(whoami)" });
  assert.equal(events.at(-1).type, "done");
  // Leading "-" gets a space so it is never parsed as a flag.
  assert.equal(events.at(-1).text, "ARG:  --help; rm -rf ~ $(whoami)");
});

test("a failing CLI produces a friendly sign-in error", async () => {
  const { events } = await run({ kind: "chat", provider: "chatgpt", history: [], message: "hi" });
  assert.equal(events.at(-1).type, "error");
  assert.match(events.at(-1).message, /isn't signed in/);
});

test("studio prompts include the tool's style guide", async () => {
  const { events } = await run({ kind: "studio", provider: "claude", studio: "kling", idea: "a fox", aspect: "9:16" });
  assert.match(events.at(-1).text, /Kling/);
  assert.match(events.at(-1).text, /9:16/);
});

test("conversations round-trip", async () => {
  const post = await fetch(`${base}/api/conversations`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "t", messages: [{ role: "user", text: "x" }] }),
  });
  const conv = await post.json();
  const list = await (await fetch(`${base}/api/conversations`)).json();
  assert.equal(list[0].id, conv.id);
  const got = await (await fetch(`${base}/api/conversations/${conv.id}`)).json();
  assert.equal(got.messages[0].text, "x");
});

test("rejects requests from other websites", async () => {
  const res = await fetch(`${base}/api/run`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ kind: "chat", provider: "claude", message: "x" }),
  });
  assert.equal(res.status, 403);
});

test("chat prompt carries earlier turns with provider names", () => {
  const p = buildChatPrompt(
    [{ role: "user", text: "hi" }, { role: "assistant", provider: "gemini", text: "hello" }],
    "next",
    { gemini: "Gemini" },
  );
  assert.match(p, /Assistant \(Gemini\):\nhello/);
  assert.match(p, /User's new message:\nnext$/);
});
