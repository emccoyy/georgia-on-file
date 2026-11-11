import * as maplibregl from "maplibre-gl";
import type { MultiPolygon } from "geojson";
import georgiaClip from "@/data/geo/georgia-clip.json";
import { BASE_ELEVATION_M, TERRAIN_TILES } from "./config";

/**
 * "Raised state" terrain. A custom protocol (`gadem://z/x/y`) fetches the
 * real Terrarium elevation tile, keeps the pixels inside Georgia, and sets every
 * pixel outside to BASE_ELEVATION_M (far below sea level). The terrain mesh then
 * forms sheer cliffs along the border, so Georgia reads as a 3D slab with real
 * mountains on top and nothing around it.
 */
export const CLIPPED_DEM_PROTOCOL = "gadem";
export const CLIPPED_DEM_TILES = `${CLIPPED_DEM_PROTOCOL}://{z}/{x}/{y}`;

const EDGE_FEATHER_PX = 0.6;

const rings = (georgiaClip.geometry as MultiPolygon).coordinates.map((poly) => poly[0]);

// Bounding box of the clip shape, for skipping tiles that are entirely outside.
const bbox = rings.flat().reduce(
  (b, [lng, lat]) => [Math.min(b[0], lng), Math.min(b[1], lat), Math.max(b[2], lng), Math.max(b[3], lat)],
  [Infinity, Infinity, -Infinity, -Infinity],
);

/** Terrarium encoding: elevation = R*256 + G + B/256 - 32768. */
function encodeTerrarium(elev: number): [number, number, number] {
  const v = elev + 32768;
  return [Math.floor(v / 256), Math.floor(v) % 256, Math.floor((v - Math.floor(v)) * 256)];
}
const BASE_RGB = encodeTerrarium(BASE_ELEVATION_M);

const lngToTileX = (lng: number, z: number) => ((lng + 180) / 360) * 2 ** z;
const latToTileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};
const tileXToLng = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
const tileYToLat = (y: number, z: number) => {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z;
  return (180 / Math.PI) * Math.atan(Math.sinh(n));
};

// MapLibre transfers each bitmap to its worker (detaching it), so cache the
// canvas and mint a fresh bitmap per request.
const flatCanvases = new Map<number, OffscreenCanvas>();
function flatTile(size: number): Promise<ImageBitmap> {
  let c = flatCanvases.get(size);
  if (!c) {
    c = new OffscreenCanvas(size, size);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = `rgb(${BASE_RGB.join(",")})`;
    ctx.fillRect(0, 0, size, size);
    flatCanvases.set(size, c);
  }
  return createImageBitmap(c);
}

async function loadClippedTile(url: string, signal: AbortSignal): Promise<ImageBitmap> {
  const [z, x, y] = url.replace(`${CLIPPED_DEM_PROTOCOL}://`, "").split("/").map(Number);

  // Tile entirely outside Georgia's bbox: no network request needed.
  const west = tileXToLng(x, z);
  const east = tileXToLng(x + 1, z);
  const north = tileYToLat(y, z);
  const south = tileYToLat(y + 1, z);
  if (east < bbox[0] || west > bbox[2] || north < bbox[1] || south > bbox[3]) return flatTile(256);

  const src = TERRAIN_TILES.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
  const res = await fetch(src, { signal });
  if (!res.ok) throw new Error(`DEM tile ${res.status}`);
  const img = await createImageBitmap(await res.blob());
  const size = img.width;

  const canvas = new OffscreenCanvas(size, size);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const dem = ctx.getImageData(0, 0, size, size);

  // Rasterize the Georgia shape into this tile's pixel space.
  const maskCanvas = new OffscreenCanvas(size, size);
  const mctx = maskCanvas.getContext("2d", { willReadFrequently: true })!;
  mctx.beginPath();
  for (const ring of rings) {
    ring.forEach(([lng, lat], i) => {
      const px = (lngToTileX(lng, z) - x) * size;
      const py = (latToTileY(lat, z) - y) * size;
      if (i === 0) mctx.moveTo(px, py);
      else mctx.lineTo(px, py);
    });
    mctx.closePath();
  }
  mctx.fillStyle = "#fff";
  // A slight blur feathers the edge so the cliff is a steep slope rather than a
  // one-pixel step, which the terrain mesh would render as a sawtooth.
  mctx.filter = `blur(${EDGE_FEATHER_PX}px)`;
  mctx.fill();
  const mask = mctx.getImageData(0, 0, size, size).data;

  // Blend in elevation space (decode → mix → encode). Blending the encoded RGB
  // directly would decode to junk heights.
  const d = dem.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = mask[i + 3] / 255;
    if (a < 1) {
      const elev = d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
      const [r, g, b] = encodeTerrarium(BASE_ELEVATION_M + (elev - BASE_ELEVATION_M) * a);
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
    d[i + 3] = 255;
  }
  ctx.putImageData(dem, 0, 0);
  return createImageBitmap(canvas);
}

let registered = false;
export function registerClippedDem() {
  if (registered) return;
  registered = true;
  maplibregl.addProtocol(CLIPPED_DEM_PROTOCOL, async (params, abort) => ({
    data: await loadClippedTile(params.url, abort.signal),
  }));
}
