import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { formatMoney, pictureUrl } from "@/constants/order";
import { useAppDispatch, useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import {
  clearAllCart,
  deleteItemCart,
  updateCartQuantity,
} from "@/redux/slice/cartSlice";
import type { Order } from "@/type";
import { DeleteOutlined, ShoppingOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

type FieldType = {
  customerName: string;
  phone: string;
  shippingAddress: string;
  note?: string;
};

const lineTotal = (item: {
  basePrice: string;
  discountPercentage?: number;
  quantity?: number;
}) =>
  Number(item.basePrice) *
  (1 - Number(item.discountPercentage ?? 0) / 100) *
  Number(item.quantity ?? 1);

const Checkout = () => {
  const [form] = Form.useForm<FieldType>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const cartArr = useAppSelector((state) => state.cart.cartArr);
  const axiosAuth = AxiosJWTInstance({ user });
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from the account profile
  useEffect(() => {
    axiosAuth
      .get("/user")
      .then(({ data }) => {
        form.setFieldsValue({
          customerName: form.getFieldValue("customerName") || data.name,
          shippingAddress:
            form.getFieldValue("shippingAddress") || data.address,
        });
      })
      .catch(() => undefined);
  }, []);

  const totals = useMemo(
    () =>
      cartArr.reduce(
        (acc, item) => ({
          subtotal:
            acc.subtotal + Number(item.basePrice) * Number(item.quantity ?? 1),
          total: acc.total + lineTotal(item),
        }),
        { subtotal: 0, total: 0 }
      ),
    [cartArr]
  );

  const onFinish = async (values: FieldType) => {
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.post<Order>("/order", {
        ...values,
        items: cartArr.map((item) => ({
          productId: item.id,
          quantity: Number(item.quantity ?? 1),
        })),
      });
      dispatch(clearAllCart());
      toast.success(`Order ${data.code} placed!`);
      navigate(`/orders/${data.id}`, { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (cartArr.length === 0) {
    return (
      <Card>
        <Helmet title="Checkout">
          <></>
        </Helmet>
        <Empty description="Your cart is empty">
          <Link to="/">
            <Button type="primary" icon={<ShoppingOutlined />}>
              Continue shopping
            </Button>
          </Link>
        </Empty>
      </Card>
    );
  }

  return (
    <>
      <Helmet title="Checkout">
        <></>
      </Helmet>
      <PageHeader
        title="Checkout"
        description="Check your items and tell us where to deliver."
        backTo="/"
      />
      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Delivery details" className="lg:col-span-3">
          <Form
            form={form}
            layout="vertical"
            requiredMark="optional"
            onFinish={onFinish}
            disabled={submitting}
          >
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item<FieldType>
                name="customerName"
                label="Full name"
                rules={[{ required: true, message: "Please enter your name" }]}
              >
                <Input size="large" placeholder="Nguyen Van A" />
              </Form.Item>
              <Form.Item<FieldType>
                name="phone"
                label="Phone number"
                rules={[
                  { required: true, message: "Please enter your phone number" },
                  {
                    pattern: /^[0-9+()\-\s]{8,20}$/,
                    message: "Phone number is not valid",
                  },
                ]}
              >
                <Input size="large" placeholder="0901 234 567" />
              </Form.Item>
            </div>
            <Form.Item<FieldType>
              name="shippingAddress"
              label="Shipping address"
              rules={[{ required: true, message: "Please enter an address" }]}
            >
              <Input.TextArea
                rows={2}
                placeholder="Street, ward, district, city"
              />
            </Form.Item>
            <Form.Item<FieldType> name="note" label="Note for the shop">
              <Input.TextArea
                rows={2}
                maxLength={500}
                showCount
                placeholder="e.g. Call before delivering"
              />
            </Form.Item>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={submitting}
              block
            >
              Place order · {formatMoney(totals.total)}
            </Button>
          </Form>
        </Card>

        <Card title={`Your cart (${cartArr.length})`} className="lg:col-span-2">
          <div className="flex flex-col divide-y divide-black/5">
            {cartArr.map((item) => (
              <div key={item.id} className="flex gap-3 py-3 first:pt-0">
                <Image
                  src={pictureUrl(item.picture)}
                  width={56}
                  height={56}
                  preview={false}
                  className="rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Typography.Text strong ellipsis>
                      {item.name}
                    </Typography.Text>
                    <Button
                      type="text"
                      size="small"
                      danger
                      aria-label={`Remove ${item.name}`}
                      icon={<DeleteOutlined />}
                      onClick={() => dispatch(deleteItemCart(item))}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <InputNumber
                      size="small"
                      min={1}
                      max={Math.max(1, Math.min(100, Number(item.stock) || 100))}
                      value={Number(item.quantity ?? 1)}
                      onChange={(value) =>
                        dispatch(
                          updateCartQuantity({
                            id: item.id,
                            quantity: Number(value) || 1,
                          })
                        )
                      }
                    />
                    <Typography.Text>{formatMoney(lineTotal(item))}</Typography.Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1 border-t border-black/5 pt-4">
            <div className="flex justify-between">
              <Typography.Text type="secondary">Subtotal</Typography.Text>
              <Typography.Text>{formatMoney(totals.subtotal)}</Typography.Text>
            </div>
            <div className="flex justify-between">
              <Typography.Text type="secondary">Discount</Typography.Text>
              <Typography.Text type="success">
                −{formatMoney(totals.subtotal - totals.total)}
              </Typography.Text>
            </div>
            <div className="mt-1 flex justify-between">
              <Typography.Text strong>Total</Typography.Text>
              <Typography.Text strong className="text-[18px]">
                {formatMoney(totals.total)}
              </Typography.Text>
            </div>
            <Typography.Text type="secondary" className="mt-2 text-xs">
              Final prices and stock are checked again when you place the order.
            </Typography.Text>
          </div>
        </Card>
      </div>
    </>
  );
};

export default Checkout;
