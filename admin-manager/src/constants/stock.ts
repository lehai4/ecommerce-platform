import type { StockReason } from "@/type";

export const STOCK_REASON_META: Record<
  StockReason,
  { label: string; color: string; description: string }
> = {
  INITIAL: { label: "Initial", color: "default", description: "Stock when the product was created" },
  SALE: { label: "Sale", color: "blue", description: "Sold in an order" },
  ORDER_CANCELLED: { label: "Order cancelled", color: "purple", description: "Returned because the order was cancelled" },
  RESTOCK: { label: "Restock", color: "green", description: "New goods arrived" },
  ADJUSTMENT: { label: "Adjustment", color: "orange", description: "Stock count, damaged goods, manual fix" },
};

export const STOCK_REASONS = Object.keys(STOCK_REASON_META) as StockReason[];
