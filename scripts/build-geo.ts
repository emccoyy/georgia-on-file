/**
 * Generates the Georgia outline and the "world minus Georgia" mask used to dim
 * neighboring states. Source: us-atlas (US Census cartographic boundaries,
 * public domain). Re-run only if you want a different resolution:
 *   npx tsx scripts/build-geo.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { buffer } from "@turf/buffer";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, MultiPolygon, Polygon, Position } from "geojson";

const require = createRequire(import.meta.url);
const topo = JSON.parse(readFileSync(require.resolve("us-atlas/states-10m.json"), "utf8")) as Topology<{
  states: GeometryCollection<{ name: string }>;
}>;

const states = feature(topo, topo.objects.states);
const ga = states.features.find((f) => f.id === "13") as Feature<Polygon | MultiPolygon> | undefined;
if (!ga) throw new Error("Georgia (FIPS 13) not found");

const round = (r: Position[]) => r.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
const polys: Position[][][] =
  ga.geometry.type === "Polygon" ? [ga.geometry.coordinates] : ga.geometry.coordinates;
const rounded = polys.map((p) => p.map(round));

const outline = {
  type: "Feature",
  properties: { name: "Georgia" },
  geometry: { type: "MultiPolygon", coordinates: rounded },
};


// Clip shape for the raised-state "slab": the outline grown by ~2 km so piers,
// beaches and barrier islands that the generalized border shaves off stay on land.
const clipped = buffer(outline as Feature<MultiPolygon>, 2, { units: "kilometers" });
if (!clipped) throw new Error("buffer failed");
const clipPolys: Position[][][] =
  clipped.geometry.type === "Polygon" ? [clipped.geometry.coordinates] : (clipped.geometry.coordinates as Position[][][]);
const clip = {
  type: "Feature",
  properties: { name: "Georgia (clip)" },
  geometry: { type: "MultiPolygon", coordinates: clipPolys.map((p) => [round(p[0])]) },
};

// Mask: a big rectangle with every Georgia outer ring punched out as a hole.
const world = [[-179, -85], [179, -85], [179, 85], [-179, 85], [-179, -85]];
const holes = clip.geometry.coordinates.map((p) => [...p[0]].reverse());
const mask = {
  type: "Feature",
  properties: {},
  geometry: { type: "Polygon", coordinates: [world, ...holes] },
};

writeFileSync("src/data/geo/georgia.json", JSON.stringify(outline));
writeFileSync("src/data/geo/georgia-clip.json", JSON.stringify(clip));
writeFileSync("src/data/geo/georgia-mask.json", JSON.stringify(mask));
console.log(`Wrote Georgia outline (${rounded.length} polygons, ${rounded.flat(2).length} vertices)`);
