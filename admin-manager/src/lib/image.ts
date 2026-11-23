export const FALLBACK_IMAGE =
  "https://st4.depositphotos.com/2495409/19919/i/450/depositphotos_199193024-stock-photo-new-product-concept-illustration-isolated.jpg";

/**
 * Builds the URL to display a stored product picture.
 *
 * - Cloudinary / any full URL is used as is.
 * - Old local uploads are stored without a scheme ("localhost:8070/x.png").
 * - With `size`, Cloudinary images are resized/cropped on their CDN so
 *   thumbnails don't download the full image.
 */
export const pictureUrl = (picture?: string | null, size?: number): string => {
  if (!picture) return FALLBACK_IMAGE;
  if (!/^https?:\/\//.test(picture)) return `http://${picture}`;
  if (size && picture.includes("res.cloudinary.com") && picture.includes("/upload/")) {
    const px = Math.round(size * 2); // sharp on retina screens
    return picture.replace(
      "/upload/",
      `/upload/c_fill,w_${px},h_${px},f_auto,q_auto/`
    );
  }
  return picture;
};
