// Each provider is driven through its vendor's OFFICIAL command-line tool, signed in
// with your consumer subscription (Claude Pro/Max, ChatGPT Plus/Pro, Google AI Pro).
// The hub never sees your password or tokens: the CLI keeps its own login.
//
// The prompt always goes in on stdin and never on the command line, so it can be
// long, it never touches a shell, and quoting can't break on Windows.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const HUB_SYSTEM_PROMPT =
  "You are one of several assistants connected through a personal AI hub. " +
  "Answer the user's latest message directly and helpfully. Use Markdown when it helps.";

// Variables that would make a CLI bill a pay-per-token API account instead of
// using your subscription. The hub strips them from every child process.
export const BILLING_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "CLAUDE_CODE_USE_BEDROCK",
  "CLAUDE_CODE_USE_VERTEX",
  "OPENAI_API_KEY",
  "CODEX_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENAI_USE_VERTEXAI",
];

export const DEFAULT_PROVIDERS = {
  claude: {
    name: "Claude",
    subscription: "Claude Pro / Max",
    color: "#d97757",
    command: "claude",
    args: [
      "-p",
      "--output-format", "text",
      "--tools", "",
      "--no-session-persistence",
      "--system-prompt", HUB_SYSTEM_PROMPT,
    ],
    modelFlag: "--model",
    install: "npm install -g @anthropic-ai/claude-code",
    login: "claude auth login",
    statusCommand: ["auth", "status"],
  },
  chatgpt: {
    name: "ChatGPT",
    subscription: "ChatGPT Plus / Pro (via Codex CLI)",
    color: "#10a37f",
    command: "codex",
    args: [
      "exec",
      "--skip-git-repo-check",
      "--sandbox", "read-only",
      "--ephemeral",
      "--color", "never",
      "--output-last-message", "{lastMessageFile}",
      "-",
    ],
    modelFlag: "--model",
    install: "npm install -g @openai/codex",
    login: "codex login   (choose \"Sign in with ChatGPT\")",
    statusCommand: ["login", "status"],
  },
  gemini: {
    name: "Gemini",
    subscription: "Google AI Pro (via Gemini CLI)",
    color: "#4f8df5",
    command: "gemini",
    args: [
      "--output-format", "text",
      "--approval-mode", "plan",
      "--skip-trust",
      "-p", "Reply to the conversation above.",
    ],
    modelFlag: "--model",
    install: "npm install -g @google/gemini-cli",
    login: "gemini   (then choose \"Sign in with Google\")",
    // Gemini CLI has no status command; a cached Google login lives here.
    credentialFile: join(homedir(), ".gemini", "oauth_creds.json"),
  },
};

/** Merge user overrides from hub.config.json over the defaults. */
export function resolveProviders(overrides = {}) {
  const out = {};
  for (const [id, def] of Object.entries(DEFAULT_PROVIDERS)) {
    const o = overrides[id] ?? {};
    if (o.enabled === false) continue;
    out[id] = { ...def, ...o, id };
  }
  for (const [id, o] of Object.entries(overrides)) {
    if (!out[id] && !DEFAULT_PROVIDERS[id] && o.enabled !== false && o.command) {
      out[id] = { name: id, color: "#9b8cff", args: [], ...o, id };
    }
  }
  return out;
}

export function cleanEnv(base = process.env) {
  const env = { ...base };
  for (const k of BILLING_ENV_VARS) delete env[k];
  env.NO_COLOR = "1";
  return env;
}

const isWin = process.platform === "win32";

// On Windows the npm-installed CLIs are .cmd shims, which need a shell. Every
// argument here is fixed config (never user text), so plain quoting is enough.
function spawnCli(command, args, opts) {
  if (!isWin) return spawn(command, args, opts);
  const quoted = args.map((a) => `"${String(a).replace(/"/g, '""')}"`);
  return spawn(command, quoted, { ...opts, shell: true });
}

/** Run a command and collect its output; resolves even on failure. */
function capture(command, args, { timeoutMs = 15000, env } = {}) {
  return new Promise((resolve) => {
    let out = "";
    let child;
    try {
      child = spawnCli(command, args, { env: env ?? cleanEnv(), stdio: ["ignore", "pipe", "pipe"] });
    } catch (err) {
      resolve({ ok: false, code: null, out: String(err.message) });
      return;
    }
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ ok: false, code: null, out: err.code === "ENOENT" ? "not installed" : err.message });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, out: out.trim() });
    });
  });
}

/** Is the CLI installed, and is it signed in with a subscription? */
export async function checkProvider(p) {
  const version = await capture(p.command, ["--version"]);
  if (!version.ok && (version.code === null || /not installed|not found|not recognized/i.test(version.out))) {
    return { installed: false, loggedIn: false, detail: "Not installed" };
  }
  const result = { installed: true, version: version.out.split("\n")[0], loggedIn: null, detail: "" };

  if (p.statusCommand) {
    const s = await capture(p.command, p.statusCommand);
    const text = s.out;
    const notLogged = /not logged in|not signed in|logged out|no credentials|"loggedIn":\s*false/i.test(text);
    const apiKey = /api key/i.test(text) && !/chatgpt|subscription|claude\.ai|max|pro/i.test(text);
    result.loggedIn = s.ok && !notLogged;
    result.detail = text.split("\n").slice(0, 3).join(" · ");
    if (result.loggedIn && apiKey) {
      result.warning = "Signed in with an API key: this bills per token. Log out and sign in with your subscription.";
    }
  } else if (p.credentialFile) {
    result.loggedIn = existsSync(p.credentialFile);
    result.detail = result.loggedIn ? "Google sign-in found" : "No Google sign-in found";
  }
  return result;
}

/**
 * Send a prompt to a provider's CLI. Calls onChunk with streamed stdout text.
 * Returns { promise, cancel }. The promise resolves to { text, code, stderr }.
 */
export function runProvider(p, prompt, { cwd, model, onChunk = () => {}, timeoutMs = 10 * 60 * 1000 } = {}) {
  const scratch = mkdtempSync(join(tmpdir(), "ai-hub-"));
  const lastMessageFile = join(scratch, "last-message.txt");
  const args = p.args.map((a) => a.replaceAll("{lastMessageFile}", lastMessageFile));
  if (model && p.modelFlag) args.unshift(p.modelFlag, model);

  let child;
  let cancelled = false;
  const promise = new Promise((resolve, reject) => {
    try {
      child = spawnCli(p.command, args, { cwd, env: cleanEnv(), stdio: ["pipe", "pipe", "pipe"] });
    } catch (err) {
      reject(err);
      return;
    }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (d) => {
      stdout += d;
      onChunk(d);
    });
    child.stderr.on("data", (d) => (stderr += d));
    child.stdin.on("error", () => {}); // CLI exited before reading everything
    child.stdin.end(prompt);

    child.on("error", (err) => {
      clearTimeout(timer);
      rmSync(scratch, { recursive: true, force: true });
      reject(err.code === "ENOENT" ? new Error(`${p.command} is not installed. Run: ${p.install}`) : err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      let text = stdout;
      // Codex streams progress; its clean final answer is written to a file.
      if (existsSync(lastMessageFile)) {
        const last = readFileSync(lastMessageFile, "utf8");
        if (last.trim()) text = last;
      }
      rmSync(scratch, { recursive: true, force: true });
      if (cancelled) resolve({ text: text.trim(), code, stderr, cancelled: true });
      else if (code !== 0 && !text.trim()) reject(new Error(friendlyError(p, stderr, code)));
      else resolve({ text: text.trim(), code, stderr });
    });
  });

  return {
    promise,
    cancel() {
      cancelled = true;
      child?.kill();
    },
  };
}

function friendlyError(p, stderr, code) {
  const s = stderr.trim();
  if (/log(ged)? ?in|auth|unauthori[sz]ed|credential|sign(ed)? in/i.test(s)) {
    return `${p.name} isn't signed in. In a terminal run: ${p.login}\n\n${s.slice(-600)}`;
  }
  if (/rate limit|usage limit|quota|too many requests|429/i.test(s)) {
    return `${p.name} says you've hit your subscription's usage limit. Try again later or use another AI.\n\n${s.slice(-600)}`;
  }
  return `${p.name} exited with code ${code}.\n\n${s.slice(-1200) || "(no error output)"}`;
}
