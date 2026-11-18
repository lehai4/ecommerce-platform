import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import OrderStatusTag from "@/components/order/OrderStatusTag";
import { formatDateTime, formatMoney } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import type { OrderListItem, Paginated } from "@/type";
import { RightOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

const MyOrders = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<OrderListItem>>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axiosAuth
      .get<Paginated<OrderListItem>>("/order", {
        params: { page, offset: PAGE_SIZE },
      })
      .then(({ data }) => setResult(data))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <>
      <Helmet title="My orders">
        <></>
      </Helmet>
      <PageHeader
        title="My orders"
        description="Track the status of your orders."
      />
      <Card styles={{ body: { padding: 0 } }}>
        <List
          loading={loading}
          dataSource={result?.data ?? []}
          locale={{
            emptyText: (
              <Empty
                description="You have not placed any orders yet"
                className="py-8"
              >
                <Link to="/">
                  <Button type="primary" icon={<ShoppingOutlined />}>
                    Start shopping
                  </Button>
                </Link>
              </Empty>
            ),
          }}
          pagination={
            result && result.total > PAGE_SIZE
              ? {
                  current: page,
                  pageSize: PAGE_SIZE,
                  total: result.total,
                  onChange: setPage,
                  align: "center",
                  className: "!pb-4",
                }
              : false
          }
          renderItem={(order) => (
            <Link
              to={`/orders/${order.id}`}
              className="block hover:bg-black/[0.02]"
            >
              <List.Item
                className="!px-6"
                extra={<RightOutlined className="text-gray-400" />}
              >
                <div className="flex flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <Typography.Text strong>{order.code}</Typography.Text>
                      <OrderStatusTag status={order.status} />
                    </div>
                    <Typography.Text type="secondary" className="text-xs">
                      {formatDateTime(order.createdAt)} · {order._count.items}{" "}
                      {order._count.items > 1 ? "items" : "item"}
                    </Typography.Text>
                  </div>
                  <Typography.Text strong>
                    {formatMoney(order.total)}
                  </Typography.Text>
                </div>
              </List.Item>
            </Link>
          )}
        />
      </Card>
    </>
  );
};

export default MyOrders;
