import type { ProductStatus } from "@/type";

export const PRODUCT_STATUSES: ProductStatus[] = ["ACTIVE", "DRAFT", "ARCHIVED"];

export const PRODUCT_STATUS_META: Record<
  ProductStatus,
  { label: string; color: string; description: string }
> = {
  ACTIVE: {
    label: "Active",
    color: "green",
    description: "Visible in the shop and can be ordered",
  },
  DRAFT: {
    label: "Draft",
    color: "default",
    description: "Hidden from the shop while you prepare it",
  },
  ARCHIVED: {
    label: "Archived",
    color: "orange",
    description: "No longer sold, hidden from the shop",
  },
};

export const PRODUCT_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name_asc", label: "Name A → Z" },
  { value: "name_desc", label: "Name Z → A" },
  { value: "price_asc", label: "Price low → high" },
  { value: "price_desc", label: "Price high → low" },
  { value: "best_selling", label: "Best selling" },
] as const;

export const LOW_STOCK = 5;
