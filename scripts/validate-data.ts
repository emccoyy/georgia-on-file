/**
 * Data validator. Run with `npm run validate:data`. Exits non-zero on any error.
 * Checks: schema/required fields, public === true, at least one https source,
 * coordinates inside the Georgia polygon, unique ids, two-way cross references.
 */
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { pointToLineDistance } from "@turf/point-to-line-distance";
import { polygonToLine } from "@turf/polygon-to-line";
import type { Feature, LineString, MultiLineString, MultiPolygon } from "geojson";
import locationsRaw from "../src/data/locations.json" with { type: "json" };
import productionsRaw from "../src/data/productions.json" with { type: "json" };
import georgia from "../src/data/geo/georgia.json" with { type: "json" };
import { LocationSchema, ProductionSchema, type FilmLocation, type Production } from "../src/data/schema";

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);

function parseAll<T>(raw: unknown[], schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } } }, label: string): T[] {
  const out: T[] = [];
  raw.forEach((item, i) => {
    const r = schema.safeParse(item);
    const id = (item as { id?: string })?.id ?? `#${i}`;
    if (r.success) out.push(r.data);
    else for (const issue of r.error.issues) err(`${label} ${id}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
  });
  return out;
}

const locations = parseAll<FilmLocation>(locationsRaw, LocationSchema, "location");
const productions = parseAll<Production>(productionsRaw, ProductionSchema, "production");

function dupes(ids: string[], label: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) err(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}
dupes(locations.map((l) => l.id), "location");
dupes(productions.map((p) => p.id), "production");

const locById = new Map(locations.map((l) => [l.id, l]));
const prodById = new Map(productions.map((p) => [p.id, p]));
const gaShape = georgia as unknown as Feature<MultiPolygon>;
// The bundled outline is generalized (1:10m), so piers, beaches and islands can
// fall just outside it. Points within this distance of the border only warn.
const EDGE_TOLERANCE_KM = 5;
const borderLines = polygonToLine(gaShape);
const borderFeatures = (borderLines.type === "FeatureCollection" ? borderLines.features : [borderLines]) as Feature<LineString | MultiLineString>[];
function kmToBorder(lng: number, lat: number) {
  let min = Infinity;
  for (const f of borderFeatures) {
    const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const c of lines) min = Math.min(min, pointToLineDistance([lng, lat], { type: "LineString", coordinates: c }, { units: "kilometers" }));
  }
  return min;
}
const edgeWarnings: string[] = [];

for (const l of locations) {
  if (!booleanPointInPolygon([l.lng, l.lat], gaShape)) {
    const km = kmToBorder(l.lng, l.lat);
    if (km > EDGE_TOLERANCE_KM) err(`location ${l.id}: coordinates ${l.lat},${l.lng} are outside Georgia (${km.toFixed(1)} km)`);
    else edgeWarnings.push(`${l.id} (${km.toFixed(1)} km past the generalized border; fine for coastal/edge sites)`);
  }
  for (const pid of l.productionIds) {
    const p = prodById.get(pid);
    if (!p) err(`location ${l.id}: unknown production "${pid}"`);
    else if (!p.locationIds.includes(l.id)) err(`location ${l.id} lists ${pid}, but ${pid}.locationIds does not list it back`);
  }
  if (!l.verified) warnings.push(l.id);
}
for (const p of productions) {
  for (const lid of p.locationIds) {
    const l = locById.get(lid);
    if (!l) err(`production ${p.id}: unknown location "${lid}"`);
    else if (!l.productionIds.includes(p.id)) err(`production ${p.id} lists ${lid}, but ${lid}.productionIds does not list it back`);
  }
}

console.log(`Checked ${locationsRaw.length} locations, ${productionsRaw.length} productions.`);
for (const w of edgeWarnings) console.log(`ⓘ ${w}`);
if (warnings.length) console.log(`ⓘ ${warnings.length} locations still have verified: false (fact-check before launch).`);
if (errors.length) {
  console.error(`\n✗ ${errors.length} error(s):\n` + errors.map((e) => `  • ${e}`).join("\n"));
  process.exit(1);
}
console.log("✓ Data is valid.");
