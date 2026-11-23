import { formatDateTime } from "@/constants/order";
import { STOCK_REASON_META } from "@/constants/stock";
import { pictureUrl } from "@/lib/image";
import type { StockMovement, StockReason } from "@/type";
import { Table, TableColumnsType, TablePaginationConfig, Tag, Typography } from "antd";
import { Link } from "react-router-dom";

type Props = {
  data: StockMovement[];
  loading?: boolean;
  /** Hide the product column (history of a single product) */
  hideProduct?: boolean;
  pagination?: false | TablePaginationConfig;
};

/** Stock changes, newest first */
const StockHistoryTable = ({ data, loading, hideProduct, pagination }: Props) => {
  const columns: TableColumnsType<StockMovement> = [
    {
      title: "Date",
      dataIndex: "createdAt",
      width: 150,
      render: (value: string) => (
        <Typography.Text type="secondary" className="whitespace-nowrap">
          {formatDateTime(value)}
        </Typography.Text>
      ),
    },
    ...(hideProduct
      ? []
      : [
          {
            title: "Product",
            key: "product",
            render: (_: unknown, m: StockMovement) => (
              <Link
                to={`/product-list/edit/${m.product.id}`}
                className="flex items-center gap-2 min-w-[180px]"
              >
                <img
                  src={pictureUrl(m.product.picture, 32)}
                  alt=""
                  className="h-8 w-8 shrink-0 rounded object-cover"
                />
                <span className="flex min-w-0 flex-col">
                  <Typography.Text className="!text-inherit" ellipsis>
                    {m.product.name}
                  </Typography.Text>
                  {m.product.sku && (
                    <Typography.Text type="secondary" className="font-mono text-xs">
                      {m.product.sku}
                    </Typography.Text>
                  )}
                </span>
              </Link>
            ),
          },
        ]),
    {
      title: "Reason",
      dataIndex: "reason",
      width: 150,
      render: (reason: StockReason) => (
        <Tag color={STOCK_REASON_META[reason].color} className="!mr-0">
          {STOCK_REASON_META[reason].label}
        </Tag>
      ),
    },
    {
      title: "Change",
      dataIndex: "change",
      align: "right",
      width: 90,
      render: (change: number) => (
        <Typography.Text strong type={change > 0 ? "success" : "danger"}>
          {change > 0 ? `+${change}` : change}
        </Typography.Text>
      ),
    },
    {
      title: "Stock after",
      dataIndex: "stockAfter",
      align: "right",
      width: 100,
    },
    {
      title: "Details",
      key: "details",
      render: (_, m) => (
        <div className="min-w-[160px]">
          {m.order && (
            <Link to={`/order/${m.order.id}`} className="block">
              Order {m.order.code}
            </Link>
          )}
          {m.note && (
            <Typography.Text type="secondary" className="block text-xs">
              {m.note}
            </Typography.Text>
          )}
          {m.user && (
            <Typography.Text type="secondary" className="block text-xs">
              by {m.user.name || m.user.email}
            </Typography.Text>
          )}
        </div>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      size="middle"
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={pagination}
      scroll={{ x: "max-content" }}
      locale={{ emptyText: "No stock changes" }}
    />
  );
};

export default StockHistoryTable;
