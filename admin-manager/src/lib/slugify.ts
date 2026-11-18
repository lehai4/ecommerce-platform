/**
 * Same rules as the API (intern-ecommerce-api/src/util/slugify.ts):
 * removes Vietnamese accents, lower-cases, joins words with "-".
 * With `typing`, a trailing "-" is kept so the user can keep typing.
 */
export const slugify = (text: string, typing = false): string => {
  const slug = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "");
  return typing ? slug : slug.replace(/-+$/, "");
};
