import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useResponsiveColumns } from "@/components/TableList";
import OrderStatusTag from "@/components/order/OrderStatusTag";
import {
  formatDateTime,
  formatMoney,
  ORDER_STATUS_META,
  ORDER_STATUSES,
  PAYMENT_STATUS_META,
} from "@/constants/order";
import PaymentTag from "@/components/order/PaymentTag";
import { useAppSelector } from "@/hook/useHookRedux";
import type {
  OrderListItem,
  OrderStatus,
  OrderStatusSummary,
  Paginated,
  PaymentStatus,
} from "@/type";
import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Table,
  TableColumnsType,
  Tabs,
  Typography,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 10;
type TabKey = OrderStatus | "ALL";

const OrderList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const navigate = useNavigate();

  // Keep filters in the URL so the list survives going to a detail page and back.
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as TabKey) || "ALL";
  const page = Number(params.get("page")) || 1;
  const paymentStatus = params.get("paymentStatus") || undefined;
  const paymentMethod = params.get("paymentMethod") || undefined;
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [debouncedSearch] = useDebounce(search.trim(), 400);

  const [result, setResult] = useState<Paginated<OrderListItem>>();
  const [summary, setSummary] = useState<OrderStatusSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const updateParams = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) =>
      value ? merged.set(key, value) : merged.delete(key)
    );
    setParams(merged, { replace: true });
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      axiosAuth.get<Paginated<OrderListItem>>("/order/admin", {
        params: {
          page,
          offset: PAGE_SIZE,
          status: status === "ALL" ? undefined : status,
          search: debouncedSearch || undefined,
          paymentStatus,
          paymentMethod,
        },
      }),
      axiosAuth.get<OrderStatusSummary[]>("/order/admin/summary"),
    ])
      .then(([list, sum]) => {
        setResult(list.data);
        setSummary(sum.data);
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [page, status, debouncedSearch, paymentStatus, paymentMethod]);

  useEffect(load, [load]);

  // Reset to page 1 when the search term changes
  useEffect(() => {
    if ((params.get("search") ?? "") !== debouncedSearch) {
      updateParams({ search: debouncedSearch || undefined, page: undefined });
    }
  }, [debouncedSearch]);

  const countFor = (key: TabKey) =>
    key === "ALL"
      ? summary.reduce((acc, s) => acc + s.count, 0)
      : summary.find((s) => s.status === key)?.count ?? 0;

  const baseColumns: TableColumnsType<OrderListItem> = [
    {
      title: "Order",
      dataIndex: "code",
      render: (code: string, order) => (
        <div className="min-w-[150px]">
          <Link to={`/order/${order.id}`}>
            <Typography.Text strong className="!text-inherit">
              {code}
            </Typography.Text>
          </Link>
          <Typography.Text type="secondary" className="block text-xs">
            {formatDateTime(order.createdAt)}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Customer",
      dataIndex: "customerName",
      render: (name: string, order) => (
        <div className="min-w-[160px]">
          <Typography.Text className="block">{name}</Typography.Text>
          <Typography.Text type="secondary" className="text-xs">
            {order.phone}
            {order.user?.email ? ` · ${order.user.email}` : ""}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: "Items",
      dataIndex: ["_count", "items"],
      align: "right",
      width: 80,
    },
    {
      title: "Total",
      dataIndex: "total",
      align: "right",
      width: 120,
      render: (total: string) => (
        <Typography.Text strong>{formatMoney(total)}</Typography.Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (s: OrderStatus) => <OrderStatusTag status={s} />,
    },
    {
      title: "Payment",
      dataIndex: "paymentStatus",
      width: 110,
      render: (_: PaymentStatus, order) => (
        <PaymentTag method={order.paymentMethod} status={order.paymentStatus} />
      ),
    },
    {
      title: "",
      key: "actions",
      align: "right",
      fixed: "right",
      width: 90,
      render: (_, order) => (
        <Link to={`/order/${order.id}`}>
          <Button icon={<EyeOutlined />}>View</Button>
        </Link>
      ),
    },
  ];
  const columns = useResponsiveColumns(baseColumns);

  return (
    <>
      <Helmet title="Orders">
        <></>
      </Helmet>
      <PageHeader
        title="Orders"
        description="Follow every order from placement to delivery."
        extra={
          <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
            Refresh
          </Button>
        }
      />
      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          activeKey={status}
          onChange={(key) =>
            updateParams({
              status: key === "ALL" ? undefined : key,
              page: undefined,
            })
          }
          items={(["ALL", ...ORDER_STATUSES] as TabKey[]).map((key) => ({
            key,
            label: (
              <span className="flex items-center gap-2">
                {key === "ALL" ? "All" : ORDER_STATUS_META[key].label}
                <Badge
                  count={countFor(key)}
                  showZero
                  overflowCount={999}
                  color={key === "PENDING" ? "#faad14" : "#94a3b8"}
                  size="small"
                />
              </span>
            ),
          }))}
        />
        <div className="mb-4 flex flex-wrap gap-2">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Search code, customer or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-72"
          />
          <Select
            allowClear
            placeholder="Payment"
            value={paymentStatus}
            onChange={(v) => updateParams({ paymentStatus: v, page: undefined })}
            options={(["UNPAID", "PAID", "REFUNDED"] as PaymentStatus[]).map((v) => ({
              value: v,
              label: PAYMENT_STATUS_META[v].label,
            }))}
            className="w-[calc(50%-4px)] sm:w-36"
          />
          <Select
            allowClear
            placeholder="Method"
            value={paymentMethod}
            onChange={(v) => updateParams({ paymentMethod: v, page: undefined })}
            options={[
              { value: "COD", label: "Cash on delivery" },
              { value: "BANK_TRANSFER", label: "Bank transfer" },
            ]}
            className="w-[calc(50%-4px)] sm:w-44"
          />
        </div>
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={result?.data ?? []}
          scroll={{ x: "max-content" }}
          size="middle"
          onRow={(order) => ({
            onDoubleClick: () => navigate(`/order/${order.id}`),
          })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: result?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `${total} orders`,
            onChange: (p) => updateParams({ page: p > 1 ? String(p) : undefined }),
          }}
        />
      </Card>
    </>
  );
};

export default OrderList;
