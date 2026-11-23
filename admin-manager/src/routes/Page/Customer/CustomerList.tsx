import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useResponsiveColumns } from "@/components/TableList";
import { formatMoney } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { CustomerListItem, Paginated } from "@/type";
import { LockOutlined, SearchOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Card,
  Input,
  Select,
  Table,
  TableColumnsType,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useDebounce } from "use-debounce";

const PAGE_SIZE = 20;

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "spent_desc", label: "Top spenders" },
  { value: "orders_desc", label: "Most orders" },
  { value: "last_order_desc", label: "Recent buyers" },
  { value: "name_asc", label: "Name A → Z" },
  { value: "oldest", label: "Oldest" },
];

const CustomerList = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const navigate = useNavigate();

  const [params, setParams] = useSearchParams();
  const page = Number(params.get("page")) || 1;
  const role = params.get("role") || undefined;
  const state = params.get("state") || undefined;
  const sort = params.get("sort") || "newest";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [search] = useDebounce(query.trim(), 400);

  const [result, setResult] = useState<Paginated<CustomerListItem>>();
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
    axiosAuth
      .get<Paginated<CustomerListItem>>("/customer", {
        params: {
          page,
          offset: PAGE_SIZE,
          role,
          state,
          sort,
          search: params.get("q") || undefined,
        },
      })
      .then(({ data }) => setResult(data))
      .catch((error) => toast.error(apiErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(load, [load]);

  useEffect(() => {
    if ((params.get("q") ?? "") !== search) {
      updateParams({ q: search || undefined, page: undefined });
    }
  }, [search]);

  const baseColumns: TableColumnsType<CustomerListItem> = [
    {
      title: "Customer",
      key: "customer",
      render: (_, c) => (
        <Link to={`/customer/${c.id}`} className="flex items-center gap-3 min-w-[220px]">
          <Avatar
            style={{ backgroundColor: c.blockedAt ? "#94a3b8" : "#4f46e5" }}
            icon={c.blockedAt ? <LockOutlined /> : !c.name ? <UserOutlined /> : undefined}
          >
            {!c.blockedAt && c.name ? c.name.charAt(0).toUpperCase() : null}
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <Typography.Text strong className="!text-inherit" ellipsis>
              {c.name || "—"}
            </Typography.Text>
            <Typography.Text type="secondary" className="text-xs">
              {c.email}
            </Typography.Text>
          </span>
        </Link>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 130,
      render: (_, c) => (
        <span className="flex flex-wrap gap-1">
          {c.role === "ADMIN" && <Tag color="purple" className="!mr-0">Admin</Tag>}
          {c.blockedAt ? (
            <Tag color="red" className="!mr-0">Locked</Tag>
          ) : (
            <Tag color="green" className="!mr-0">Active</Tag>
          )}
        </span>
      ),
    },
    {
      title: "Orders",
      dataIndex: "orders",
      align: "right",
      width: 90,
    },
    {
      title: "Total spent",
      dataIndex: "spent",
      align: "right",
      width: 130,
      render: (spent: number) => (
        <Typography.Text strong={spent > 0} type={spent ? undefined : "secondary"}>
          {formatMoney(spent)}
        </Typography.Text>
      ),
    },
    {
      title: "Last order",
      dataIndex: "lastOrderAt",
      width: 130,
      render: (value: string | null) =>
        value ? (
          <Typography.Text>{dayjs(value).format("DD/MM/YYYY")}</Typography.Text>
        ) : (
          <Typography.Text type="secondary">Never</Typography.Text>
        ),
    },
    {
      title: "Joined",
      dataIndex: "createdAt",
      width: 120,
      responsive: ["lg"],
      render: (value: string) => (
        <Typography.Text type="secondary">{dayjs(value).format("DD/MM/YYYY")}</Typography.Text>
      ),
    },
  ];
  const columns = useResponsiveColumns(baseColumns);

  return (
    <>
      <Helmet title="Customers">
        <></>
      </Helmet>
      <PageHeader
        title="Customers"
        description="Who buys from you, how often and how much."
      />
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Email, name or phone..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select
            allowClear
            placeholder="Role"
            value={role}
            onChange={(v) => updateParams({ role: v, page: undefined })}
            options={[
              { value: "USER", label: "Customers" },
              { value: "ADMIN", label: "Admins" },
            ]}
            className="w-[calc(50%-4px)] sm:w-36"
          />
          <Select
            allowClear
            placeholder="Account"
            value={state}
            onChange={(v) => updateParams({ state: v, page: undefined })}
            options={[
              { value: "active", label: "Active" },
              { value: "blocked", label: "Locked" },
            ]}
            className="w-[calc(50%-4px)] sm:w-36"
          />
          <Select
            value={sort}
            onChange={(v) => updateParams({ sort: v === "newest" ? undefined : v, page: undefined })}
            options={SORTS}
            className="w-full sm:ml-auto sm:w-44"
          />
        </div>
        <Table
          rowKey="id"
          size="middle"
          columns={columns}
          dataSource={result?.data ?? []}
          loading={loading}
          scroll={{ x: "max-content" }}
          onRow={(c) => ({ onDoubleClick: () => navigate(`/customer/${c.id}`) })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: result?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `${total} ${total === 1 ? "account" : "accounts"}`,
            onChange: (p) => updateParams({ page: p > 1 ? String(p) : undefined }),
          }}
          locale={{ emptyText: "No customers match these filters" }}
        />
      </Card>
    </>
  );
};

export default CustomerList;
