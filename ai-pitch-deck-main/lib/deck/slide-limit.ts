/** Reads DECK_SLIDE_LIMIT, a dev/testing cap on how many outline sections become Slides; unset means every section. */
export function slideLimitFrom(value: string | undefined): number | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return undefined;
  const n = Number.parseInt(trimmed, 10);
  return n > 0 ? n : undefined;
}
