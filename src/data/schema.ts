import { z } from "zod";

/** Production formats. Also drives pin color on the map. */
export const PRODUCTION_TYPES = ["feature film", "TV series", "limited series", "TV movie", "documentary"] as const;

export const LOCATION_TYPES = [
  "park",
  "restaurant",
  "street",
  "landmark",
  "campus",
  "studio exterior",
  "historic site",
  "natural area",
  "beach",
  "museum",
  "attraction",
  "venue",
  "shopping",
  "waterfront",
  "cemetery",
  "hotel",
  "theater",
  "other",
] as const;

const url = z.url({ protocol: /^https$/ });

export const ImageSchema = z.object({
  /** Wikimedia Commons file URL only — no stills, posters or logos. */
  src: url,
  alt: z.string().min(1),
  credit: z.string().min(1),
  license: z.string().min(1),
  sourceUrl: url,
});

export const ProductionSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  title: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  type: z.enum(PRODUCTION_TYPES),
  /** Distributor or network; null when no source names one. */
  distributor: z.string().min(1).nullable(),
  /** One sentence, original wording. */
  logline: z.string().min(10),
  locationIds: z.array(z.string()).min(1),
  gaFilmOfficeRef: z.string().nullable(),
  sources: z.array(url).min(1),
  verified: z.boolean(),
});

export const LocationSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case"),
  name: z.string().min(1),
  type: z.enum(LOCATION_TYPES),
  city: z.string().min(1),
  county: z.string().min(1),
  lat: z.number().min(30.3).max(35.1),
  lng: z.number().min(-85.7).max(-80.7),
  /** True when coordinates are a landmark / town-center approximation. */
  approximateCoords: z.boolean(),
  /** Hard rule: only publicly accessible places. Literal so `false` cannot type-check. */
  public: z.literal(true),
  /** What was filmed here, original wording. */
  description: z.string().min(10),
  productionIds: z.array(z.string()).min(1),
  sources: z.array(url).min(1),
  image: ImageSchema.optional(),
  verified: z.boolean(),
  /** Internal fact-check note. Never shown on the site. */
  note: z.string().optional(),
});

export type ProductionType = (typeof PRODUCTION_TYPES)[number];
export type LocationType = (typeof LOCATION_TYPES)[number];
export type Production = z.infer<typeof ProductionSchema>;
export type FilmLocation = z.infer<typeof LocationSchema>;
