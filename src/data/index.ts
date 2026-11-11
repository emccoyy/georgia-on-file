import type { FeatureCollection, Point, Polygon } from "geojson";
import locationsJson from "./locations.json";
import productionsJson from "./productions.json";
import type { FilmLocation, Production, ProductionType } from "./schema";

// JSON is validated by `npm run validate:data` (and in CI/build), so a cast is safe here.
export const locations = locationsJson as FilmLocation[];
export const productions = productionsJson as Production[];

export const locationById = new Map(locations.map((l) => [l.id, l]));
export const productionById = new Map(productions.map((p) => [p.id, p]));

export function productionsForLocation(l: FilmLocation): Production[] {
  return l.productionIds.map((id) => productionById.get(id)).filter((p): p is Production => !!p);
}

/** A location's pin color comes from its first-listed production. */
export function primaryType(l: FilmLocation): ProductionType {
  return productionById.get(l.productionIds[0])?.type ?? "feature film";
}

export type PinProperties = {
  id: string;
  name: string;
  city: string;
  ptype: ProductionType;
  titles: string;
};

export function locationsToPoints(list: FilmLocation[] = locations): FeatureCollection<Point, PinProperties> {
  return {
    type: "FeatureCollection",
    features: list.map((l) => ({
      type: "Feature",
      id: l.id,
      geometry: { type: "Point", coordinates: [l.lng, l.lat] },
      properties: {
        id: l.id,
        name: l.name,
        city: l.city,
        ptype: primaryType(l),
        titles: productionsForLocation(l)
          .map((p) => p.title)
          .join(" · "),
      },
    })),
  };
}

/**
 * Light-beam footprints: a small n-gon around each point, extruded upward by
 * a fill-extrusion layer. Radius is in meters.
 */
export function locationsToBeams(
  radiusM: number,
  list: FilmLocation[] = locations,
  sides = 10,
): FeatureCollection<Polygon, PinProperties> {
  const pts = locationsToPoints(list);
  return {
    type: "FeatureCollection",
    features: pts.features.map((f) => {
      const [lng, lat] = f.geometry.coordinates;
      const dLat = radiusM / 111_320;
      const dLng = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
      const ring = Array.from({ length: sides + 1 }, (_, i) => {
        const a = (i / sides) * Math.PI * 2;
        return [lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat];
      });
      return { type: "Feature", id: f.id, properties: f.properties, geometry: { type: "Polygon", coordinates: [ring] } };
    }),
  };
}
