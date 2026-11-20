import { renderMarkdown } from "./markdown.js";

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const n = Object.assign(document.createElement(tag), props);
  for (const c of children) n.append(c);
  return n;
};

const state = {
  providers: [],
  studios: [],
  status: {},
  chat: { id: null, title: "New chat", messages: [], selected: new Set() },
  compareSelected: new Set(),
  compareAnswers: {},
  busy: false,
};

const prov = (id) => state.providers.find((p) => p.id === id) ?? { id, name: id, color: "#888" };
const isReady = (id) => state.status[id]?.installed && state.status[id]?.loggedIn !== false;

/* ---------- Talking to the server ---------- */

async function api(path, body, method = body ? "POST" : "GET") {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? res.statusText);
  return data;
}

/**
 * Stream a run. onText gets the full text so far. Returns { promise, stop }.
 */
function runStream(body, onText) {
  const ctrl = new AbortController();
  const promise = (async () => {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error((await res.json()).error ?? res.statusText);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const ev = JSON.parse(line);
        if (ev.type === "chunk") onText((text += ev.text), false);
        else if (ev.type === "done") return ev.text || text;
        else if (ev.type === "error") throw new Error(ev.message);
      }
    }
    return text;
  })().catch((err) => {
    if (err.name === "AbortError") return null;
    throw err;
  });
  return { promise, stop: () => ctrl.abort() };
}

/* ---------- Shared UI bits ---------- */

function messageCard({ role, provider, text = "", meta = "" }) {
  const node = $("#tpl-message").content.firstElementChild.cloneNode(true);
  node.classList.add(role);
  const who = $(".who", node);
  if (role === "user") who.textContent = "You";
  else {
    const p = prov(provider);
    who.append(el("span", { className: "dot", style: `background:${p.color}` }), p.name);
  }
  $(".meta", node).textContent = meta;
  setBody(node, text);
  return node;
}

function setBody(card, text, streaming = false) {
  const body = $(".body", card);
  body.innerHTML = renderMarkdown(text);
  body.classList.toggle("cursor", streaming);
}

function showError(card, message) {
  card.classList.add("error");
  const body = $(".body", card);
  body.classList.remove("cursor");
  body.textContent = message;
}

function addStopButton(card, stop) {
  const btn = el("button", { className: "stop", type: "button", textContent: "Stop" });
  btn.onclick = stop;
  $("header", card).append(btn);
  return () => btn.remove();
}

/** Run one provider into a card, streaming. Resolves to the final text (or null). */
async function streamInto(card, body) {
  if (!isReady(body.provider)) {
    const p = prov(body.provider);
    const s = state.status[body.provider];
    showError(card, `${p.name} isn't set up yet (${s?.installed ? "not signed in" : "not installed"}). See the Setup tab.`);
    return null;
  }
  setBody(card, "", true);
  $(".meta", card).textContent = "thinking…";
  const started = performance.now();
  const run = runStream(body, (t) => setBody(card, t, true));
  const removeStop = addStopButton(card, run.stop);
  try {
    const text = await run.promise;
    const secs = ((performance.now() - started) / 1000).toFixed(1);
    $(".meta", card).textContent = text === null ? "stopped" : `${secs}s`;
    setBody(card, text ?? $(".body", card).textContent);
    return text;
  } catch (err) {
    $(".meta", card).textContent = "";
    showError(card, err.message);
    return null;
  } finally {
    removeStop();
  }
}

function providerPicker(container, selected, { multi = true, onChange } = {}) {
  container.replaceChildren();
  for (const p of state.providers) {
    const chip = el("button", { type: "button", className: "chip" });
    chip.style.setProperty("--c", p.color);
    chip.append(el("span", { className: "swatch" }), p.name);
    if (!isReady(p.id)) {
      chip.classList.add("unavailable");
      chip.title = "Not set up yet: see the Setup tab";
    }
    chip.setAttribute("aria-pressed", selected.has(p.id));
    chip.onclick = () => {
      if (selected.has(p.id)) selected.delete(p.id);
      else {
        if (!multi) selected.clear();
        selected.add(p.id);
      }
      providerPicker(container, selected, { multi, onChange });
      onChange?.();
    };
    container.append(chip);
  }
}

function fillProviderSelect(select, value) {
  select.replaceChildren(...state.providers.map((p) => el("option", { value: p.id, textContent: p.name })));
  if (value) select.value = value;
}

function setBusy(on) {
  state.busy = on;
  document.querySelectorAll("button.primary").forEach((b) => (b.disabled = on));
}

/* ---------- Tabs ---------- */

function showTab(name) {
  document.querySelectorAll("[role=tab]").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((p) => (p.hidden = p.id !== `tab-${name}`));
  try { localStorage.setItem("hub.tab", name); } catch {}
}
document.querySelectorAll("[role=tab]").forEach((t) => (t.onclick = () => showTab(t.dataset.tab)));

/* ---------- Status & setup ---------- */

async function loadStatus(refresh = false) {
  const s = await api(`/api/status${refresh ? "?refresh=1" : ""}`);
  state.status = s.providers;
  renderStatus();
  renderSetup(s.strippedEnvVars);
  providerPicker($("#chat-providers"), state.chat.selected);
  providerPicker($("#compare-providers"), state.compareSelected);
}

function statusOf(id) {
  const s = state.status[id];
  if (!s) return { cls: "", label: "checking…" };
  if (!s.installed) return { cls: "bad", label: "not installed" };
  if (s.loggedIn === false) return { cls: "bad", label: "not signed in" };
  if (s.warning) return { cls: "warn", label: "API key!" };
  return { cls: "ok", label: "ready" };
}

function renderStatus() {
  $("#provider-status").replaceChildren(
    ...state.providers.map((p) => {
      const { cls, label } = statusOf(p.id);
      return el("li", {}, el("span", { className: `dot ${cls}` }), p.name, el("span", { className: "state", textContent: label }));
    }),
  );
}

function copyButton(text) {
  const b = el("button", { type: "button", textContent: "Copy" });
  b.onclick = async () => {
    await navigator.clipboard.writeText(text);
    b.textContent = "Copied";
    setTimeout(() => (b.textContent = "Copy"), 1200);
  };
  return b;
}

function cmdRow(text) {
  return el("div", { className: "cmd" }, el("code", { textContent: text }), copyButton(text.replace(/\s{2,}\(.*\)$/, "")));
}

function renderSetup(strippedEnvVars = []) {
  const warn = $("#env-warning");
  warn.hidden = !strippedEnvVars.length;
  warn.textContent = strippedEnvVars.length
    ? `Heads up: ${strippedEnvVars.join(", ")} ${strippedEnvVars.length > 1 ? "are" : "is"} set in the terminal that started the hub. The hub hides ${strippedEnvVars.length > 1 ? "them" : "it"} from the AIs so they use your subscriptions instead of a pay-per-token API key.`
    : "";

  $("#setup-cards").replaceChildren(
    ...state.providers.map((p) => {
      const s = state.status[p.id] ?? {};
      const { cls, label } = statusOf(p.id);
      const card = el("div", { className: "card setup-card" });
      const h = el("h3", {}, el("span", { className: "dot", style: `background:${p.color}` }), p.name, el("span", { className: `badge ${cls}`, textContent: label }));
      card.append(h, el("p", { className: "sub", textContent: `Uses: ${p.subscription ?? "your subscription"}` }));
      const steps = el("ol");
      steps.append(el("li", {}, "Install it (needs Node.js):", cmdRow(p.install)));
      steps.append(el("li", {}, "Sign in once with your subscription account:", cmdRow(p.login)));
      steps.append(el("li", { textContent: "Click Re-check above." }));
      card.append(steps);
      if (s.warning) card.append(el("div", { className: "notice", textContent: s.warning }));
      if (s.version || s.detail) card.append(el("div", { className: "detail", textContent: [s.version, s.detail].filter(Boolean).join(" · ") }));
      return card;
    }),
  );
}
$("#refresh-status").onclick = () => loadStatus(true);

/* ---------- Chat ---------- */

function renderChat() {
  $("#chat-title").textContent = state.chat.title;
  $("#chat-log").replaceChildren(...state.chat.messages.map((m) => messageCard(m)));
  $("#chat-log").scrollTop = $("#chat-log").scrollHeight;
  renderConvList();
}

async function saveChat() {
  if (!state.chat.messages.length) return;
  const saved = await api("/api/conversations", {
    id: state.chat.id,
    title: state.chat.title,
    mode: "chat",
    messages: state.chat.messages,
  });
  state.chat.id = saved.id;
  renderConvList();
}

async function renderConvList() {
  const list = await api("/api/conversations");
  $("#conv-list").replaceChildren(
    ...list.map((c) => {
      const li = el("li", { className: c.id === state.chat.id ? "active" : "" });
      const open = el("button", { className: "open", textContent: c.title, title: c.title });
      open.onclick = async () => {
        const conv = await api(`/api/conversations/${c.id}`);
        Object.assign(state.chat, { id: conv.id, title: conv.title, messages: conv.messages });
        showTab("chat");
        renderChat();
      };
      const del = el("button", { className: "del", textContent: "×", title: "Delete chat" });
      del.onclick = async () => {
        if (!confirm(`Delete "${c.title}"?`)) return;
        await api(`/api/conversations/${c.id}`, undefined, "DELETE");
        if (state.chat.id === c.id) newChat();
        else renderConvList();
      };
      li.append(open, del);
      return li;
    }),
  );
}

function newChat() {
  Object.assign(state.chat, { id: null, title: "New chat", messages: [] });
  showTab("chat");
  renderChat();
  $("#chat-input").focus();
}
$("#new-chat").onclick = newChat;

$("#chat-form").onsubmit = async (e) => {
  e.preventDefault();
  const input = $("#chat-input");
  const text = input.value.trim();
  if (!text || state.busy) return;
  const order = state.providers.map((p) => p.id).filter((id) => state.chat.selected.has(id));
  if (!order.length) {
    alert("Pick at least one AI above the message box.");
    return;
  }
  input.value = "";
  if (!state.chat.messages.length) state.chat.title = text.replace(/[*_`#>]/g, "").slice(0, 60);
  $("#chat-title").textContent = state.chat.title;

  const history = [...state.chat.messages];
  const userMsg = { role: "user", text };
  state.chat.messages.push(userMsg);
  const log = $("#chat-log");
  log.append(messageCard(userMsg));
  setBusy(true);
  try {
    // Several AIs answer in turn; each sees what the ones before it said.
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      const card = messageCard({ role: "assistant", provider: id });
      log.append(card);
      log.scrollTop = log.scrollHeight;
      // Turn so far: the user's message plus any replies from earlier AIs this round.
      const thisTurn = state.chat.messages.slice(history.length);
      const reply = await streamInto(card, {
        kind: "chat",
        provider: id,
        history: i ? [...history, ...thisTurn] : history,
        message: i
          ? "(No new text: reply to my last message above. Other assistants have already answered it; give your own answer, building on, correcting or disagreeing with theirs where useful.)"
          : text,
      });
      if (reply) state.chat.messages.push({ role: "assistant", provider: id, text: reply });
      log.scrollTop = log.scrollHeight;
    }
    await saveChat();
  } finally {
    setBusy(false);
  }
};

$("#chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    $("#chat-form").requestSubmit();
  }
});

/* ---------- Compare ---------- */

$("#compare-form").onsubmit = async (e) => {
  e.preventDefault();
  const text = $("#compare-input").value.trim();
  const ids = state.providers.map((p) => p.id).filter((id) => state.compareSelected.has(id));
  if (!text || !ids.length || state.busy) return;
  const grid = $("#compare-grid");
  grid.replaceChildren();
  $("#compare-synth").hidden = true;
  $("#synth-out").replaceChildren();
  state.compareAnswers = {};
  state.compareQuestion = text;
  setBusy(true);
  try {
    await Promise.all(
      ids.map(async (id) => {
        const card = messageCard({ role: "assistant", provider: id });
        grid.append(card);
        const answer = await streamInto(card, { kind: "chat", provider: id, history: [], message: text });
        if (answer) state.compareAnswers[id] = answer;
      }),
    );
  } finally {
    setBusy(false);
  }
  if (Object.keys(state.compareAnswers).length > 1) $("#compare-synth").hidden = false;
};

$("#synth-run").onclick = async () => {
  const provider = $("#synth-provider").value;
  const previous = Object.entries(state.compareAnswers)
    .map(([id, t]) => `### Answer from ${prov(id).name}\n${t}`)
    .join("\n\n");
  const card = messageCard({ role: "assistant", provider });
  $("#synth-out").replaceChildren(card);
  setBusy(true);
  try {
    await streamInto(card, {
      kind: "relay",
      provider,
      stepIndex: 1,
      original: state.compareQuestion,
      previous,
      instruction: "Several AI assistants answered the same request. Combine them into the single best answer: keep what is correct and useful, fix mistakes, note real disagreements briefly.",
    });
  } finally {
    setBusy(false);
  }
};

/* ---------- Relay ---------- */

const RELAY_PRESETS = {
  "Draft → critique → revise": [
    { provider: "chatgpt", instruction: "Write a first draft that answers this request." },
    { provider: "gemini", instruction: "Critique the previous draft: list concrete problems, gaps and errors. Do not rewrite it." },
    { provider: "claude", instruction: "Using the critique, write the improved final version of the draft. Output only the final version." },
  ],
  "Story idea → animation shot list": [
    { provider: "claude", instruction: "Turn this into a short story outline for an animated film: characters, setting, beats." },
    { provider: "gemini", instruction: "Turn the outline into a numbered shot list. For each shot: duration, framing, camera movement, action, and a one-line visual description." },
    { provider: "chatgpt", instruction: "Rewrite each shot as a standalone prompt for an AI video generator (Sora/Veo style), keeping characters and style consistent across shots." },
  ],
  "Research → fact-check": [
    { provider: "gemini", instruction: "Answer this thoroughly." },
    { provider: "claude", instruction: "Fact-check the previous answer. Flag anything doubtful and correct what you can, then give the corrected answer." },
  ],
  "Code → review": [
    { provider: "chatgpt", instruction: "Write the code for this request." },
    { provider: "claude", instruction: "Review the code for bugs and edge cases, then output a corrected version with a short list of what you changed." },
  ],
};

function relayStep({ provider, instruction } = {}) {
  const li = el("li");
  const select = el("select", { "aria-label": "AI for this step" });
  fillProviderSelect(select, provider ?? state.providers[0]?.id);
  const remove = el("button", { className: "remove", type: "button", textContent: "Remove", onclick: () => li.remove() });
  const ta = el("textarea", { rows: 2, placeholder: "What should this step do?", value: instruction ?? "" });
  li.append(el("div", { className: "step-head" }, select, remove), ta);
  return li;
}

function loadPreset(name) {
  const steps = RELAY_PRESETS[name] ?? [];
  const known = new Set(state.providers.map((p) => p.id));
  $("#relay-steps").replaceChildren(
    ...steps.map((s) => relayStep({ ...s, provider: known.has(s.provider) ? s.provider : state.providers[0]?.id })),
  );
}

$("#relay-add").onclick = () => $("#relay-steps").append(relayStep());
$("#relay-preset").onchange = (e) => loadPreset(e.target.value);

$("#relay-run").onclick = async () => {
  const original = $("#relay-input").value.trim();
  const steps = [...$("#relay-steps").children].map((li) => ({
    provider: $("select", li).value,
    instruction: $("textarea", li).value.trim(),
  }));
  if (!original || !steps.length || state.busy) return;
  const out = $("#relay-out");
  out.replaceChildren();
  setBusy(true);
  let previous = "";
  try {
    for (let i = 0; i < steps.length; i++) {
      const card = messageCard({ role: "assistant", provider: steps[i].provider });
      $(".who", card).prepend(`Step ${i + 1} · `);
      out.append(card);
      const text = await streamInto(card, { kind: "relay", provider: steps[i].provider, original, previous, instruction: steps[i].instruction, stepIndex: i });
      if (!text) break; // stop the chain on error or Stop
      previous = text;
    }
  } finally {
    setBusy(false);
  }
};

/* ---------- Animation studio ---------- */

function selectedStudio() {
  return state.studios.find((s) => s.id === $("#studio-target").value);
}

function updateStudioInfo() {
  const s = selectedStudio();
  if (!s) return;
  $("#studio-included").textContent = `Uses your ${s.includedWith} credits on ${new URL(s.url).host}.`;
  const open = $("#studio-open");
  open.href = s.url;
  open.textContent = `Open ${s.name} ↗`;
}
$("#studio-target").onchange = updateStudioInfo;

let studioText = "";
$("#studio-form").onsubmit = async (e) => {
  e.preventDefault();
  const idea = $("#studio-idea").value.trim();
  if (!idea || state.busy) return;
  const out = $("#studio-out");
  out.classList.remove("empty");
  const card = messageCard({ role: "assistant", provider: $("#studio-writer").value });
  out.replaceChildren(card);
  $("#studio-copy").disabled = true;
  setBusy(true);
  try {
    studioText = (await streamInto(card, {
      kind: "studio",
      provider: $("#studio-writer").value,
      studio: $("#studio-target").value,
      idea,
      duration: $("#studio-duration").value,
      aspect: $("#studio-aspect").value,
    })) ?? "";
    $("#studio-copy").disabled = !studioText;
  } finally {
    setBusy(false);
  }
};
$("#studio-copy").onclick = async () => {
  await navigator.clipboard.writeText(studioText);
  $("#studio-copy").textContent = "Copied!";
  setTimeout(() => ($("#studio-copy").textContent = "Copy prompt"), 1200);
};

/* ---------- Boot ---------- */

async function boot() {
  const cfg = await api("/api/config");
  state.providers = cfg.providers;
  state.studios = cfg.studios;


  fillProviderSelect($("#synth-provider"), "claude");
  fillProviderSelect($("#studio-writer"), "claude");
  $("#studio-target").replaceChildren(...state.studios.map((s) => el("option", { value: s.id, textContent: s.name })));
  updateStudioInfo();
  $("#relay-preset").replaceChildren(...Object.keys(RELAY_PRESETS).map((k) => el("option", { value: k, textContent: k })));
  loadPreset(Object.keys(RELAY_PRESETS)[0]);

  renderStatus();
  providerPicker($("#chat-providers"), state.chat.selected);
  providerPicker($("#compare-providers"), state.compareSelected);
  renderChat();

  let tab = "chat";
  try { tab = localStorage.getItem("hub.tab") || "chat"; } catch {}
  showTab(tab);

  await loadStatus();
  // Start with the AIs that are ready to go.
  const ready = state.providers.filter((p) => isReady(p.id)).map((p) => p.id);
  if (ready[0]) state.chat.selected.add(ready[0]);
  ready.forEach((id) => state.compareSelected.add(id));
  providerPicker($("#chat-providers"), state.chat.selected);
  providerPicker($("#compare-providers"), state.compareSelected);
  if (!ready.length) showTab("setup");
}

boot().catch((err) => {
  document.body.prepend(el("div", { className: "notice", textContent: `Couldn't start: ${err.message}` }));
});
