# AI Hub

One place to use the AIs you already pay for (**Claude Pro/Max, ChatGPT Plus/Pro, Google AI Pro**) together, without API keys and without paying per token.

It runs on your own computer. Behind the scenes it drives each company's **official command-line app**, which you sign in to once with your normal subscription account:

| AI | Official app it uses | Signs in with |
|---|---|---|
| Claude | [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (`claude`) | Claude Pro / Max |
| ChatGPT | [Codex CLI](https://github.com/openai/codex) (`codex`) | ChatGPT Plus / Pro |
| Gemini | [Gemini CLI](https://github.com/google-gemini/gemini-cli) (`gemini`) | Google account (AI Pro raises the limits) |

Usage counts against your subscription's normal limits, the same as using those apps directly.

## What you can do

- **Chat**: talk to one AI, or pick several and they answer in turn, each one seeing what the others said.
- **Compare**: send one prompt to all of them at once, read the answers side by side, then have one of them merge the best parts.
- **Relay**: chain them. For example ChatGPT drafts, Gemini critiques, Claude writes the final version. Comes with presets, including *Story idea → animation shot list*.
- **Animation studio**: describe a scene, pick a tool (Sora, Google Flow/Veo, Runway, Kling, Luma, Pika, Higgsfield, Midjourney), and one of your AIs writes a prompt tuned to that tool's style. Copy it and open the tool in one click.
- Chats are saved locally in `ai-hub/data/`.

## Setup (about 5 minutes)

You need [Node.js](https://nodejs.org) 20 or newer.

**1. Install the AI apps you subscribe to** (skip any you don't have):

```bash
npm install -g @anthropic-ai/claude-code @openai/codex @google/gemini-cli
```

**2. Sign in to each once, with your subscription account:**

```bash
claude auth login
```

```bash
codex login
```

Choose **Sign in with ChatGPT**, not an API key.

```bash
gemini
```

Choose **Sign in with Google**, then type `/quit`.

**3. Start the hub:**

```bash
cd ai-hub
```

```bash
npm start
```

Open <http://localhost:4317>. The **Setup** tab shows which AIs are ready and what's missing.

## How "no tokens" works, and its limits

- The hub never calls a paid API. It runs the official apps, and those apps use your subscription login.
- If `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` or similar are set in your terminal, the apps would bill those keys instead. **The hub removes them** for every AI it starts, and the Setup tab warns you if one of the apps is signed in with an API key.
- Your subscription's usage limits still apply (for example Claude Max's 5-hour windows). If you hit one, the hub tells you and you can switch to another AI.
- Each AI runs in a private `ai-hub/workspace/` folder with its tools off or read-only, so a chat can't change files on your computer.
- The hub only listens on `127.0.0.1` and refuses requests from other websites, so nothing else on your network or in your browser can use your subscriptions through it.

### Animation and video tools

Runway, Kling, Luma, Pika, Higgsfield, Midjourney, Sora and Flow/Veo only let you spend subscription credits **on their own websites**. Their APIs, where they exist, are billed separately per video. There's no permitted way to drive their websites with your login from another app, so the hub doesn't try. It does the part it can do for free: writes a strong, tool-specific prompt with your connected AIs and opens the site for you.

Sora comes with ChatGPT Plus/Pro, and Flow (Veo) comes with Google AI Pro, so you may already have two video tools included.

## Customizing

Copy `hub.config.example.json` to `hub.config.json` and edit it to:

- change a CLI's flags or model (e.g. `--model opus`),
- turn an AI off (`"enabled": false`),
- add any other command-line AI, such as a local model through [Ollama](https://ollama.com),
- add, edit or hide animation tools.

Set `PORT` to use another port: `PORT=5000 npm start`.

## Development

```bash
npm test
```

No dependencies: the server is plain Node (`server.mjs`, `lib/`) and the page is plain HTML/CSS/JS (`public/`). The tests use a fake CLI (`test/fake-cli.mjs`), so they don't need any AI installed.
