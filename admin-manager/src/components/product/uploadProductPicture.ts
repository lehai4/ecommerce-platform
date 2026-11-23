import type { AxiosInstance } from "axios";
import type { ProductProps } from "@/type";

/** Uploads a picture for a product (stored on Cloudinary by the API) */
export const uploadProductPicture = async (
  axiosAuth: AxiosInstance,
  productId: string,
  file: File
): Promise<ProductProps> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await axiosAuth.patch<ProductProps>(
    `/product/picture/${productId}`,
    formData,
    // The instance defaults to JSON; let the browser set the multipart boundary.
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};
