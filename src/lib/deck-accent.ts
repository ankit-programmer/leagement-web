/**
 * Deterministic per-deck identity: hash the deck id onto one of six gradient
 * pairs (the rtlayer avatar palette), so the same deck always wears the same
 * hue everywhere — cards, headers, badges. Identity by id, never by sort rank.
 */
const ACCENTS = [
  { from: "#0090f6", to: "#0057d8" }, // blue
  { from: "#8b5cf6", to: "#6d28d9" }, // violet
  { from: "#10b981", to: "#047857" }, // emerald
  { from: "#f59e0b", to: "#b45309" }, // amber
  { from: "#ec4899", to: "#be185d" }, // pink
  { from: "#06b6d4", to: "#0e7490" }, // cyan
] as const;

export function deckAccent(id: string): (typeof ACCENTS)[number] {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return ACCENTS[Math.abs(hash) % ACCENTS.length] as (typeof ACCENTS)[number];
}

export function deckGradient(id: string): string {
  const accent = deckAccent(id);
  return `linear-gradient(135deg, ${accent.from}, ${accent.to})`;
}
