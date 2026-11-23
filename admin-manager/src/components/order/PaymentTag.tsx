import { PAYMENT_STATUS_META } from "@/constants/order";
import type { PaymentMethod, PaymentStatus } from "@/type";
import { Tag, Typography } from "antd";

/** "Paid" tag with the payment method under it */
const PaymentTag = ({
  method,
  status,
  compact,
}: {
  method: PaymentMethod;
  status: PaymentStatus;
  compact?: boolean;
}) => (
  <span className="inline-flex flex-col items-start">
    <Tag color={PAYMENT_STATUS_META[status].color} className="!mr-0">
      {PAYMENT_STATUS_META[status].label}
    </Tag>
    {!compact && (
      <Typography.Text type="secondary" className="text-xs">
        {method === "COD" ? "COD" : "Transfer"}
      </Typography.Text>
    )}
  </span>
);

export default PaymentTag;
