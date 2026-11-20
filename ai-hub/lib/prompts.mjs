// The CLIs are stateless here (sessions aren't persisted), so each turn sends the
// conversation so far as a plain transcript. Messages are { role, provider?, text }.

const MAX_TRANSCRIPT_CHARS = 120_000;

export function buildChatPrompt(history, message, names = {}) {
  const lines = [];
  for (const m of history) {
    const who = m.role === "user" ? "User" : `Assistant${m.provider ? ` (${names[m.provider] ?? m.provider})` : ""}`;
    lines.push(`${who}:\n${m.text}`);
  }
  let transcript = lines.join("\n\n");
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    transcript = "[earlier messages trimmed]\n…" + transcript.slice(-MAX_TRANSCRIPT_CHARS);
  }
  if (!transcript) return message;
  return (
    "Here is our conversation so far. Other assistants may have replied in it too.\n\n" +
    "<conversation>\n" + transcript + "\n</conversation>\n\n" +
    "User's new message:\n" + message
  );
}

/** One step of a relay: an instruction applied to the previous step's output. */
export function buildRelayPrompt({ original, previous, instruction, stepIndex }) {
  if (stepIndex === 0) return instruction ? `${instruction}\n\n${original}` : original;
  return (
    `${instruction || "Improve on the previous answer."}\n\n` +
    "<original_request>\n" + original + "\n</original_request>\n\n" +
    "<previous_step_output>\n" + previous + "\n</previous_step_output>"
  );
}

export function buildStudioPrompt({ idea, studio, duration, aspect }) {
  return (
    `Write a prompt for the AI video/animation tool "${studio.name}".\n` +
    `Follow this tool's prompting style: ${studio.style}\n` +
    (duration ? `Target length: ${duration}.\n` : "") +
    (aspect ? `Aspect ratio: ${aspect}.\n` : "") +
    "Output ONLY the finished prompt text, ready to paste, with no preamble or explanation. " +
    "If the idea needs several shots, number each shot as its own prompt.\n\n" +
    "The idea:\n" + idea
  );
}
