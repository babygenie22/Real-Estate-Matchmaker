/** Strip raw ZIP codes from a service area list, leaving only city/area names. */
export const cityAreas = (serviceAreas: string[] | null | undefined): string[] =>
  serviceAreas?.filter(a => !/^\d+$/.test(a)) ?? [];

/** Generate initials from a full name (e.g. "Sarah Mitchell" → "SM"). */
export const initials = (name: string): string =>
  name.split(" ").map(n => n[0]).join("");

/** Format a dollar amount as a compact string (e.g. 1_500_000 → "$1.5M", 350_000 → "$350K"). */
export const formatPrice = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;
