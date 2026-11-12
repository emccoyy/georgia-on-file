/**
 * Site-wide settings. Fill in your links here; anything left null is simply
 * not shown on the site (no broken placeholder links go live).
 */
export const SITE = {
  name: "Georgia on Film",
  author: "Ethan McCoy",
  // TODO(Ethan): add your portfolio URL, e.g. "https://ethanmccoy.com"
  portfolioUrl: null as string | null,
  // TODO(Ethan): add a contact email, e.g. "hello@ethanmccoy.com"
  email: null as string | null,
  // TODO(Ethan): optional, e.g. "https://www.linkedin.com/in/…"
  linkedinUrl: null as string | null,
  disclaimer:
    "Unofficial fan project. Not affiliated with any studio, network or the Georgia Film Office. Public places only.",
};

export const NAV = [
  { href: "/", label: "Map" },
  { href: "/locations", label: "Index" },
  { href: "/stats", label: "Stats" },
  { href: "/about", label: "About" },
] as const;
