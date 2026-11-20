#!/usr/bin/env node
// Stands in for a real AI CLI in tests: echoes stdin back in two chunks, and
// reports which billing env vars it could see.
import { BILLING_ENV_VARS } from "../lib/providers.mjs";

if (process.argv.includes("--version")) {
  console.log("fake-cli 1.0.0");
  process.exit(0);
}
if (process.argv.includes("--fail")) {
  console.error("Error: not logged in");
  process.exit(1);
}
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", async () => {
  const leaked = BILLING_ENV_VARS.filter((k) => process.env[k]);
  process.stdout.write("ECHO: ");
  await new Promise((r) => setTimeout(r, 30));
  process.stdout.write(input);
  process.stdout.write(`\nLEAKED: ${leaked.join(",") || "none"}`);
});
