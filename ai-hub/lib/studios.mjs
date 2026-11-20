// Animation and video tools. None of these let a monthly subscription be used
// from outside their own website or app (their APIs, where they exist, are billed
// separately per generation). So the hub does the part it can do for free: one of
// your connected AIs writes a prompt tuned for the tool, and you paste it into the
// tool's own site, where your subscription's credits apply.
//
// Add your own in hub.config.json under "studios".

export const DEFAULT_STUDIOS = [
  {
    id: "sora",
    name: "Sora",
    url: "https://sora.chatgpt.com",
    includedWith: "ChatGPT Plus / Pro",
    style:
      "Sora: one flowing paragraph. Describe subject, action, setting, lighting, lens and camera movement, mood and art style. Mention duration and aspect ratio at the end.",
  },
  {
    id: "flow",
    name: "Google Flow (Veo)",
    url: "https://labs.google/fx/tools/flow",
    includedWith: "Google AI Pro / Ultra",
    style:
      "Veo: a cinematic shot description. Lead with the shot type and camera move, then subject, action, environment, lighting, style. Veo can generate audio, so add a short 'Audio:' line with dialogue, sound effects and ambience.",
  },
  {
    id: "runway",
    name: "Runway",
    url: "https://app.runwayml.com",
    includedWith: "Runway subscription",
    style:
      "Runway Gen-4: short and concrete. Describe only motion and camera for image-to-video ('The camera slowly dollies in as...'); for text-to-video, one sentence of subject + action + scene + style. Avoid negative phrasing.",
  },
  {
    id: "kling",
    name: "Kling",
    url: "https://app.klingai.com",
    includedWith: "Kling subscription",
    style:
      "Kling: subject + movement + scene + camera language + lighting + atmosphere, as comma-separated phrases. Add a separate 'Negative prompt:' line.",
  },
  {
    id: "luma",
    name: "Luma Dream Machine",
    url: "https://dream-machine.lumalabs.ai",
    includedWith: "Luma subscription",
    style: "Luma Ray: natural-language description of the shot, focusing on camera motion and the key action. Keep it under 80 words.",
  },
  {
    id: "pika",
    name: "Pika",
    url: "https://pika.art",
    includedWith: "Pika subscription",
    style: "Pika: a short punchy prompt (under 40 words) naming style, subject, action and camera.",
  },
  {
    id: "higgsfield",
    name: "Higgsfield",
    url: "https://higgsfield.ai",
    includedWith: "Higgsfield subscription",
    style:
      "Higgsfield: describe the subject and scene, then name ONE camera-motion preset that fits (e.g. crash zoom, dolly in, 360 orbit, bullet time, FPV drone) on its own line as 'Motion preset:'.",
  },
  {
    id: "midjourney",
    name: "Midjourney (video)",
    url: "https://www.midjourney.com/imagine",
    includedWith: "Midjourney subscription",
    style:
      "Midjourney: a still-image prompt first (comma-separated descriptors, then parameters like --ar 16:9 --style raw), then a separate 'Motion:' line describing how it should animate.",
  },
];

export function resolveStudios(overrides) {
  if (!Array.isArray(overrides)) return DEFAULT_STUDIOS;
  const byId = new Map(DEFAULT_STUDIOS.map((s) => [s.id, s]));
  for (const s of overrides) {
    if (s.enabled === false) byId.delete(s.id);
    else byId.set(s.id, { ...byId.get(s.id), ...s });
  }
  return [...byId.values()];
}
