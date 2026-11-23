import type { OrderStatus, PaymentMethod, PaymentStatus } from "@/type";

export const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "SHIPPING",
  "DELIVERED",
  "CANCELLED",
];

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; color: string; description: string }
> = {
  PENDING: {
    label: "Pending",
    color: "gold",
    description: "Waiting for the shop to confirm",
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "blue",
    description: "The shop is preparing the order",
  },
  SHIPPING: {
    label: "Shipping",
    color: "purple",
    description: "On the way to the customer",
  },
  DELIVERED: {
    label: "Delivered",
    color: "green",
    description: "The customer has received the order",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "red",
    description: "The order was cancelled and stock was returned",
  },
};

/** Must match the API rules in intern-ecommerce-api/src/models/order/order-status.ts */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPING", "CANCELLED"],
  SHIPPING: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Label for the button that moves an order to `status` */
export const ORDER_ACTION_LABEL: Record<OrderStatus, string> = {
  PENDING: "Set pending",
  CONFIRMED: "Confirm order",
  SHIPPING: "Mark as shipping",
  DELIVERED: "Mark as delivered",
  CANCELLED: "Cancel order",
};

export const formatMoney = (value: string | number | null | undefined) =>
  Number(value ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

export const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });


export { FALLBACK_IMAGE, pictureUrl } from "@/lib/image";

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; description: string }> = {
  COD: { label: "Cash on delivery", description: "Pay the courier when the order arrives" },
  BANK_TRANSFER: { label: "Bank transfer", description: "Transfer with the QR code, the shop confirms it" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, { label: string; color: string }> = {
  UNPAID: { label: "Unpaid", color: "default" },
  PAID: { label: "Paid", color: "green" },
  REFUNDED: { label: "Refunded", color: "volcano" },
};
