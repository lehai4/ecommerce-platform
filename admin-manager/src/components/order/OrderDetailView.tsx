import {
  formatDateTime,
  formatMoney,
  ORDER_STATUS_META,
  pictureUrl,
} from "@/constants/order";
import type { Order, OrderStatus } from "@/type";
import {
  Card,
  Descriptions,
  Image,
  Steps,
  Table,
  TableColumnsType,
  Timeline,
  Typography,
} from "antd";
import OrderStatusTag from "./OrderStatusTag";

const FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED"];

/** Read-only view of an order, shared by the admin and customer pages */
const OrderDetailView = ({
  order,
  aside,
}: {
  order: Order;
  /** Extra cards at the top of the side column (e.g. payment) */
  aside?: React.ReactNode;
}) => {
  const isCancelled = order.status === "CANCELLED";
  // Last status reached before cancelling, so the progress bar stops there.
  const reached = isCancelled
    ? [...order.history].reverse().find((h) => h.status !== "CANCELLED")
        ?.status ?? "PENDING"
    : order.status;
  const current = FLOW.indexOf(reached);

  const columns: TableColumnsType<Order["items"][number]> = [
    {
      title: "Product",
      key: "product",
      render: (_, item) => (
        <div className="flex items-center gap-3 min-w-[200px]">
          <Image
            src={pictureUrl(item.productPicture)}
            width={44}
            height={44}
            preview={false}
            className="rounded-md object-cover"
          />
          <div className="min-w-0">
            <Typography.Text strong className="block">
              {item.productName}
            </Typography.Text>
            {item.discountPercentage > 0 && (
              <Typography.Text type="secondary" className="text-xs">
                <s>{formatMoney(item.basePrice)}</s> −{item.discountPercentage}%
              </Typography.Text>
            )}
            {!item.productId && (
              <Typography.Text type="warning" className="text-xs block">
                Product no longer exists
              </Typography.Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: "Unit price",
      dataIndex: "unitPrice",
      align: "right",
      render: (v: string) => formatMoney(v),
    },
    { title: "Qty", dataIndex: "quantity", align: "right", width: 70 },
    {
      title: "Total",
      dataIndex: "lineTotal",
      align: "right",
      render: (v: string) => (
        <Typography.Text strong>{formatMoney(v)}</Typography.Text>
      ),
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="flex flex-col gap-6 xl:col-span-2">
        <Card>
          <Steps
            responsive
            size="small"
            current={current}
            status={
              isCancelled
                ? "error"
                : order.status === "DELIVERED"
                ? "finish"
                : "process"
            }
            items={FLOW.map((status, index) => ({
              title: ORDER_STATUS_META[status].label,
              description:
                isCancelled && index === current ? "Cancelled here" : undefined,
            }))}
          />
        </Card>
        <Card
          title={`Items (${order.items.length})`}
          styles={{ body: { padding: 0 } }}
        >
          <Table
            rowKey="id"
            columns={columns}
            dataSource={order.items}
            pagination={false}
            scroll={{ x: "max-content" }}
            size="middle"
          />
          <div className="flex flex-col items-end gap-1 px-6 py-4 border-t border-black/5">
            <div className="flex w-full max-w-[280px] justify-between">
              <Typography.Text type="secondary">Subtotal</Typography.Text>
              <Typography.Text>{formatMoney(order.subtotal)}</Typography.Text>
            </div>
            <div className="flex w-full max-w-[280px] justify-between">
              <Typography.Text type="secondary">Discount</Typography.Text>
              <Typography.Text type="success">
                −{formatMoney(order.discountTotal)}
              </Typography.Text>
            </div>
            <div className="flex w-full max-w-[280px] justify-between mt-1">
              <Typography.Text strong>Total</Typography.Text>
              <Typography.Text strong className="text-[18px]">
                {formatMoney(order.total)}
              </Typography.Text>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        {aside}
        <Card title="Customer">
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: "name", label: "Name", children: order.customerName },
              { key: "phone", label: "Phone", children: order.phone },
              {
                key: "address",
                label: "Address",
                children: order.shippingAddress,
              },
              ...(order.user
                ? [{ key: "account", label: "Account", children: order.user.email }]
                : []),
              ...(order.note
                ? [{ key: "note", label: "Note", children: order.note }]
                : []),
            ]}
          />
        </Card>
        <Card title="History">
          <Timeline
            className="!mt-2"
            items={[...order.history].reverse().map((h) => ({
              color: ORDER_STATUS_META[h.status].color,
              children: (
                <div>
                  <div className="flex items-center gap-2">
                    <OrderStatusTag status={h.status} />
                    <Typography.Text type="secondary" className="text-xs">
                      {formatDateTime(h.createdAt)}
                    </Typography.Text>
                  </div>
                  {h.note && (
                    <Typography.Paragraph className="!mb-0 !mt-1">
                      {h.note}
                    </Typography.Paragraph>
                  )}
                </div>
              ),
            }))}
          />
        </Card>
      </div>
    </div>
  );
};

export default OrderDetailView;
