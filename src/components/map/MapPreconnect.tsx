import { preconnect } from "react-dom";

/** Warm up connections to the tile hosts before the map asks for its first tiles. */
export function MapPreconnect() {
  preconnect("https://tiles.openfreemap.org", { crossOrigin: "anonymous" });
  preconnect("https://s3.amazonaws.com", { crossOrigin: "anonymous" });
  return null;
}
