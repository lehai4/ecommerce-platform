import { ORDER_STATUS_META } from "@/constants/order";
import type { OrderStatus } from "@/type";
import { Tag } from "antd";

const OrderStatusTag = ({ status }: { status: OrderStatus }) => (
  <Tag color={ORDER_STATUS_META[status].color} className="!mr-0">
    {ORDER_STATUS_META[status].label}
  </Tag>
);

export default OrderStatusTag;
