import { OrderStatus } from '@prisma/client';

/** Which statuses an order may move to from its current status */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
  SHIPPING: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

/** True if an order may move from `from` to `to` */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}
