/*
 * Shape assignment for the project badges.
 *
 * Deliberately not Math.random: "a random shape per project" should mean each
 * project owns a figure, not that the figure changes on every reload. Hashing
 * the name gives that for free and resolves at build time.
 *
 * Uniqueness is decided across the whole list rather than per name, because a
 * bare hash collides badly at this size — five names over eight shapes lands a
 * duplicate more often than not, and two identical figures a few rows apart
 * read as a bug rather than as variety. The cost is that adding a project can
 * shuffle a later one's glyph; stability within a build matters more than
 * stability across an edit to the list.
 */

export const SHAPE_COUNT = 8;

// FNV-1a: tiny, no dependency, and well spread over short lowercase names.
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function assignGlyphs(names: string[]): number[] {
  const used = new Set<number>();
  return names.map((name) => {
    let i = hash(name) % SHAPE_COUNT;
    // Linear probe to the next free figure. Once the list outgrows SHAPE_COUNT
    // repeats are unavoidable, so stop probing rather than spin.
    while (used.has(i) && used.size < SHAPE_COUNT) i = (i + 1) % SHAPE_COUNT;
    used.add(i);
    return i;
  });
}
