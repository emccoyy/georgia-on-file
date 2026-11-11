// MapLibre v6 ships its web worker as a separate ES module that it resolves
// relative to its own file. Bundlers move that file, so we serve a copy from
// /public and point MapLibre at it with setWorkerUrl(). Runs on postinstall.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dist = join(dirname(require.resolve("maplibre-gl/package.json")), "dist");
mkdirSync("public/vendor", { recursive: true });
copyFileSync(join(dist, "maplibre-gl-worker.mjs"), "public/vendor/maplibre-gl-worker.mjs");
console.log("Copied MapLibre worker to public/vendor/");
