import AxiosJWTInstance from "@/InstanceAxios";
import {
  formatDateTime,
  formatMoney,
  PAYMENT_METHOD_META,
  PAYMENT_STATUS_META,
} from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Order, OrderPayment, PaymentStatus } from "@/type";
import { Alert, Button, Card, Input, Modal, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const ACTIONS: Record<PaymentStatus, { to: PaymentStatus; label: string; danger?: boolean }[]> = {
  UNPAID: [{ to: "PAID", label: "Mark as paid" }],
  PAID: [
    { to: "REFUNDED", label: "Refund", danger: true },
    { to: "UNPAID", label: "Mark as unpaid" },
  ],
  REFUNDED: [{ to: "PAID", label: "Mark as paid" }],
};

/** Payment of an order. Admins record payments; customers see how to pay. */
const PaymentCard = ({
  order,
  admin,
  onOrderChange,
}: {
  order: Order;
  admin?: boolean;
  onOrderChange?: (order: Order) => void;
}) => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [payment, setPayment] = useState<OrderPayment>();
  const [target, setTarget] = useState<PaymentStatus>();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const transfer = order.paymentMethod === "BANK_TRANSFER";

  useEffect(() => {
    if (!transfer) return;
    axiosAuth
      .get<OrderPayment>(`/order/${order.id}/payment`)
      .then(({ data }) => setPayment(data))
      .catch(() => undefined);
  }, [order.id, order.paymentStatus]);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const { data } = await axiosAuth.patch<Order>(`/order/${order.id}/payment`, {
        status: target,
        note: note.trim() || undefined,
      });
      onOrderChange?.(data);
      toast.success(`Payment: ${PAYMENT_STATUS_META[target].label}`);
      setTarget(undefined);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const bank = payment?.bankTransfer;
  const showHowToPay = transfer && order.paymentStatus === "UNPAID" && order.status !== "CANCELLED";

  return (
    <Card
      title="Payment"
      extra={
        <Tag color={PAYMENT_STATUS_META[order.paymentStatus].color} className="!mr-0">
          {PAYMENT_STATUS_META[order.paymentStatus].label}
        </Tag>
      }
    >
      <div className="flex flex-col gap-1">
        <Typography.Text strong>{PAYMENT_METHOD_META[order.paymentMethod].label}</Typography.Text>
        <Typography.Text type="secondary" className="text-xs">
          {order.paidAt
            ? `Paid on ${formatDateTime(order.paidAt)}`
            : PAYMENT_METHOD_META[order.paymentMethod].description}
        </Typography.Text>
      </div>

      {admin && order.status === "CANCELLED" && order.paymentStatus === "PAID" && (
        <Alert
          className="!mt-3"
          type="warning"
          showIcon
          message="This order was cancelled but is paid: refund the customer."
        />
      )}

      {showHowToPay && bank && (
        <div className="mt-4 rounded-lg border border-black/5 p-3">
          {bank.qrUrl ? (
            <img
              src={bank.qrUrl}
              alt="VietQR code for the transfer"
              className="mx-auto mb-3 w-full max-w-[220px] rounded-md bg-white"
            />
          ) : (
            <Alert
              className="!mb-3"
              type="info"
              showIcon
              message="Bank account not configured"
              description={admin ? "Set BANK_ID and BANK_ACCOUNT_NO in the API .env to show a QR code." : "The shop will send you the transfer details."}
            />
          )}
          {bank.configured && (
            <div className="flex flex-col gap-1 text-[13px]">
              <span>
                <Typography.Text type="secondary">Bank: </Typography.Text>
                {bank.bankId}
              </span>
              <span>
                <Typography.Text type="secondary">Account: </Typography.Text>
                <Typography.Text copyable>{bank.accountNo}</Typography.Text>
                {bank.accountName && ` · ${bank.accountName}`}
              </span>
              <span>
                <Typography.Text type="secondary">Amount: </Typography.Text>
                <Typography.Text strong copyable={{ text: String(bank.amount) }}>
                  {bank.amount.toLocaleString("vi-VN")}
                </Typography.Text>
              </span>
              <span>
                <Typography.Text type="secondary">Message: </Typography.Text>
                <Typography.Text strong copyable>
                  {bank.content}
                </Typography.Text>
              </span>
            </div>
          )}
          {!admin && (
            <Typography.Text type="secondary" className="mt-2 block text-xs">
              Write the message exactly so the shop can find your order. Your
              order is confirmed once the money is received.
            </Typography.Text>
          )}
        </div>
      )}

      {admin && (
        <Space wrap className="mt-4">
          {ACTIONS[order.paymentStatus].map((action) => (
            <Button
              key={action.to}
              danger={action.danger}
              type={action.to === "PAID" ? "primary" : "default"}
              onClick={() => {
                setNote("");
                setTarget(action.to);
              }}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      )}

      <Modal
        title={target ? `${ACTIONS[order.paymentStatus].find((a) => a.to === target)?.label}?` : ""}
        open={!!target}
        onCancel={() => setTarget(undefined)}
        onOk={save}
        okText="Save"
        okButtonProps={{ loading: saving, danger: target === "REFUNDED" }}
      >
        <p className="mb-3">
          {target === "PAID"
            ? `Confirm you received ${formatMoney(order.total)} for ${order.code}.`
            : target === "REFUNDED"
            ? "Record that the money was sent back to the customer."
            : "The order will be waiting for payment again."}
        </p>
        <Input.TextArea
          rows={2}
          maxLength={300}
          placeholder="Note, e.g. bank reference (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </Card>
  );
};

export default PaymentCard;
