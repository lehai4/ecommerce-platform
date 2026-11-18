import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import OrderDetailView from "@/components/order/OrderDetailView";
import OrderStatusTag from "@/components/order/OrderStatusTag";
import {
  ORDER_ACTION_LABEL,
  ORDER_STATUS_META,
  ORDER_STATUS_TRANSITIONS,
} from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Order, OrderStatus } from "@/type";
import { Button, Card, Input, Modal, Result, Skeleton } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";

const OrderDetail = () => {
  const { id } = useParams();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [order, setOrder] = useState<Order>();
  const [notFound, setNotFound] = useState(false);
  const [target, setTarget] = useState<OrderStatus>();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axiosAuth
      .get<Order>(`/order/${id}`)
      .then(({ data }) => setOrder(data))
      .catch(() => setNotFound(true));
  }, [id]);

  const openChange = (status: OrderStatus) => {
    setNote("");
    setTarget(status);
  };

  const onConfirm = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const { data } = await axiosAuth.patch<Order>(`/order/${id}/status`, {
        status: target,
        note: note.trim() || undefined,
      });
      setOrder(data);
      toast.success(`Order is now ${ORDER_STATUS_META[target].label}`);
      setTarget(undefined);
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
        title="Order not found"
        extra={
          <Link to="/order">
            <Button type="primary">Back to orders</Button>
          </Link>
        }
      />
    );
  }

  const nextStatuses = order ? ORDER_STATUS_TRANSITIONS[order.status] : [];
  const isCancel = target === "CANCELLED";

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
        backTo={-1}
        extra={nextStatuses.map((status) => (
          <Button
            key={status}
            type={status === "CANCELLED" ? "default" : "primary"}
            danger={status === "CANCELLED"}
            onClick={() => openChange(status)}
          >
            {ORDER_ACTION_LABEL[status]}
          </Button>
        ))}
      />
      {order ? (
        <OrderDetailView order={order} />
      ) : (
        <Card>
          <Skeleton active paragraph={{ rows: 6 }} />
        </Card>
      )}
      <Modal
        title={target ? `${ORDER_ACTION_LABEL[target]}?` : ""}
        open={!!target}
        onCancel={() => setTarget(undefined)}
        onOk={onConfirm}
        okText={target ? ORDER_ACTION_LABEL[target] : "OK"}
        okButtonProps={{ danger: isCancel, loading: saving }}
        cancelText="Back"
      >
        <p className="mb-3">
          {isCancel
            ? "The items will be returned to stock. This cannot be undone."
            : target && ORDER_STATUS_META[target].description}
        </p>
        <Input.TextArea
          rows={3}
          maxLength={500}
          placeholder={
            isCancel ? "Reason for cancelling (optional)" : "Note (optional)"
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Modal>
    </>
  );
};

export default OrderDetail;
