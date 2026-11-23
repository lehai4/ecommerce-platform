import type { AxiosInstance } from "axios";
import type { CategoryImageChange } from "./CategoryForm";

/** Applies the image change chosen in the category form */
export const saveCategoryImage = async (
  axiosAuth: AxiosInstance,
  categoryId: string,
  change: CategoryImageChange
): Promise<void> => {
  if (change.type === "upload") {
    const form = new FormData();
    form.append("file", change.file);
    await axiosAuth.post(`/category/${categoryId}/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  } else if (change.type === "remove") {
    await axiosAuth.delete(`/category/${categoryId}/image`);
  }
};
