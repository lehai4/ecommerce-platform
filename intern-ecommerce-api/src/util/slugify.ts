/** Turns any text into a URL friendly slug.
 *
 * Removes Vietnamese (and other) accents, lower-cases and joins words with "-".
 * @example slugify("Áo thun   Nam  ") === "ao-thun-nam"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Returns `base` or `base-2`, `base-3`... the first one `isTaken` says is free */
export async function uniqueSlug(
  text: string,
  isTaken: (slug: string) => Promise<boolean>,
  fallback = 'item',
): Promise<string> {
  const base = slugify(text) || fallback;
  let candidate = base;
  for (let i = 2; await isTaken(candidate); i++) {
    candidate = `${base}-${i}`;
  }
  return candidate;
}
