import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import OrderStatusTag from "@/components/order/OrderStatusTag";
import { formatDateTime, formatMoney } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { CustomerDetail as Customer, OrderListItem } from "@/type";
import { LockOutlined, UnlockOutlined, UserOutlined } from "@ant-design/icons";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Empty,
  Popconfirm,
  Result,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const CustomerDetail = () => {
  const { id } = useParams();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const isMe = user?.user?.id === id;

  const [customer, setCustomer] = useState<Customer>();
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosAuth
      .get<Customer>(`/customer/${id}`)
      .then(({ data }) => setCustomer(data))
      .catch(() => setNotFound(true));
  }, [id]);

  const save = async (path: "role" | "block", body: object, done: string) => {
    setSaving(true);
    try {
      const { data } = await axiosAuth.patch<Customer>(`/customer/${id}/${path}`, body);
      setCustomer(data);
      toast.success(done);
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (notFound) {
    return (
      <Result
        status="404"
        title="Customer not found"
        extra={
          <Link to="/customer">
            <Button type="primary">Back to customers</Button>
          </Link>
        }
      />
    );
  }

  if (!customer) {
    return (
      <Card>
        <Skeleton avatar active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  const locked = !!customer.blockedAt;

  return (
    <>
      <Helmet title={customer.name || customer.email}>
        <></>
      </Helmet>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar
              size={40}
              style={{ backgroundColor: locked ? "#94a3b8" : "#4f46e5" }}
              icon={locked ? <LockOutlined /> : !customer.name ? <UserOutlined /> : undefined}
            >
              {!locked && customer.name ? customer.name.charAt(0).toUpperCase() : null}
            </Avatar>
            {customer.name || customer.email}
            {customer.role === "ADMIN" && <Tag color="purple">Admin</Tag>}
            {locked && <Tag color="red">Locked</Tag>}
          </span>
        }
        description={`${customer.email} · joined ${dayjs(customer.createdAt).format("DD/MM/YYYY")}`}
        backTo={-1}
        extra={
          !isMe && (
            <Popconfirm
              title={locked ? "Unlock this account?" : "Lock this account?"}
              description={
                <span className="block max-w-[260px]">
                  {locked
                    ? "The customer will be able to sign in again."
                    : "The customer is signed out everywhere and cannot sign in until unlocked. Orders are kept."}
                </span>
              }
              onConfirm={() =>
                save(
                  "block",
                  { blocked: !locked },
                  locked ? "Account unlocked" : "Account locked"
                )
              }
              okText={locked ? "Unlock" : "Lock"}
              okButtonProps={{ danger: !locked }}
            >
              <Button
                danger={!locked}
                icon={locked ? <UnlockOutlined /> : <LockOutlined />}
                loading={saving}
              >
                {locked ? "Unlock account" : "Lock account"}
              </Button>
            </Popconfirm>
          )
        }
      />

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card size="small">
            <Statistic title="Orders" value={customer.stats.orders} />
            {customer.stats.cancelledOrders > 0 && (
              <Typography.Text type="secondary" className="text-xs">
                + {customer.stats.cancelledOrders} cancelled
              </Typography.Text>
            )}
          </Card>
          <Card size="small">
            <Statistic title="Total spent" value={formatMoney(customer.stats.spent)} />
          </Card>
          <Card size="small">
            <Statistic title="Average order" value={formatMoney(customer.stats.averageOrderValue)} />
          </Card>
          <Card size="small">
            <Statistic
              title="Last order"
              value={
                customer.stats.lastOrderAt
                  ? dayjs(customer.stats.lastOrderAt).format("DD/MM/YYYY")
                  : "Never"
              }
            />
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card
            title="Recent orders"
            className="xl:col-span-2"
            styles={{ body: { padding: 0 } }}
            extra={customer.stats.orders > 10 && <Typography.Text type="secondary">Last 10</Typography.Text>}
          >
            <Table<OrderListItem>
              rowKey="id"
              size="middle"
              pagination={false}
              dataSource={customer.recentOrders}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders yet" /> }}
              columns={[
                {
                  title: "Order",
                  dataIndex: "code",
                  render: (code: string, o) => (
                    <div>
                      <Link to={`/order/${o.id}`}>{code}</Link>
                      <Typography.Text type="secondary" className="block text-xs">
                        {formatDateTime(o.createdAt)}
                      </Typography.Text>
                    </div>
                  ),
                },
                { title: "Items", dataIndex: ["_count", "items"], align: "right", width: 70 },
                {
                  title: "Total",
                  dataIndex: "total",
                  align: "right",
                  render: (v: string) => formatMoney(v),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  render: (s: OrderListItem["status"]) => <OrderStatusTag status={s} />,
                },
              ]}
            />
          </Card>

          <div className="flex flex-col gap-4">
            <Card title="Account">
              <Descriptions
                column={1}
                size="small"
                items={[
                  { key: "email", label: "Email", children: customer.email },
                  { key: "name", label: "Name", children: customer.name || "—" },
                  { key: "address", label: "Address", children: customer.address || "—" },
                  {
                    key: "role",
                    label: "Role",
                    children: (
                      <Select
                        size="small"
                        value={customer.role}
                        disabled={isMe || saving}
                        onChange={(role) =>
                          save("role", { role }, role === "ADMIN" ? "Now an admin" : "Now a customer")
                        }
                        options={[
                          { value: "USER", label: "Customer" },
                          { value: "ADMIN", label: "Admin" },
                        ]}
                        className="w-32"
                      />
                    ),
                  },
                  ...(locked
                    ? [{ key: "locked", label: "Locked", children: formatDateTime(customer.blockedAt!) }]
                    : []),
                ]}
              />
              {isMe && (
                <Typography.Text type="secondary" className="text-xs">
                  This is your account: you cannot change your own role or lock it.
                </Typography.Text>
              )}
            </Card>

            <Card title="Delivery addresses">
              {customer.addresses.length === 0 ? (
                <Typography.Text type="secondary">No orders yet</Typography.Text>
              ) : (
                <div className="flex flex-col divide-y divide-black/5">
                  {customer.addresses.map((a, index) => (
                    <div key={index} className="py-2 first:pt-0 last:pb-0">
                      <Typography.Text strong className="block">
                        {a.customerName} · {a.phone}
                      </Typography.Text>
                      <Typography.Text className="block">{a.shippingAddress}</Typography.Text>
                      <Typography.Text type="secondary" className="text-xs">
                        Used {a.times} {a.times === 1 ? "time" : "times"}, last on{" "}
                        {dayjs(a.lastUsedAt).format("DD/MM/YYYY")}
                      </Typography.Text>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerDetail;
