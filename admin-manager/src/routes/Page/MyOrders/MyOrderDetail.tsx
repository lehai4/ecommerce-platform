import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import OrderDetailView from "@/components/order/OrderDetailView";
import OrderStatusTag from "@/components/order/OrderStatusTag";
import { ORDER_STATUS_META } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import type { Order } from "@/type";
import { Button, Card, Input, Modal, Result, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiErrorMessage } from "@/lib/apiError";

const MyOrderDetail = () => {
  const { id } = useParams();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [order, setOrder] = useState<Order>();
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    axiosAuth
      .get<Order>(`/order/${id}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true));
  }, [id]);

  const onCancel = async () => {
    setCancelling(true);
    try {
      const { data } = await axiosAuth.patch<Order>(`/order/${id}/cancel`, {
        note: cancelNote || undefined,
      });
      setOrder(data);
      setCancelOpen(false);
      toast.success("Order cancelled");
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setCancelling(false);
    }
  };

  if (notFound) {
    return (
      <Result
        status="404"
        title="Order not found"
        extra={
          <Link to="/orders">
            <Button type="primary">Back to my orders</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <Helmet title={order ? `Order ${order.code}` : "Order"}>
        <></>
      </Helmet>
      <PageHeader
        title={
          order ? (
            <span className="flex flex-wrap items-center gap-3">
              {order.code} <OrderStatusTag status={order.status} />
            </span>
          ) : (
            "Order"
          )
        }
        description={order && ORDER_STATUS_META[order.status].description}
        backTo="/orders"
        extra={
          order?.status === "PENDING" && (
            <Button danger onClick={() => setCancelOpen(true)}>
              Cancel order
            </Button>
          )
        }
      />
      {order ? (
        <OrderDetailView order={order} />
      ) : (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      )}
      <Modal
        title="Cancel this order?"
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onOk={onCancel}
        okText="Cancel order"
        okButtonProps={{ danger: true, loading: cancelling }}
        cancelText="Keep order"
      >
        <p className="mb-3">The items will be returned to stock.</p>
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder="Reason (optional)"
          value={cancelNote}
          onChange={(e) => setCancelNote(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default MyOrderDetail;
