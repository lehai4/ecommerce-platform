import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import CartWarnings from "@/components/cart/CartWarnings";
import { formatMoney, PAYMENT_METHOD_META, pictureUrl } from "@/constants/order";
import { useCart } from "@/hook/useCart";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import type { Order, PaymentMethod } from "@/type";
import { DeleteOutlined, ShoppingOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  Radio,
  Skeleton,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

type FieldType = {
  customerName: string;
  phone: string;
  shippingAddress: string;
  note?: string;
  paymentMethod: PaymentMethod;
};

const Checkout = () => {
  const [form] = Form.useForm<FieldType>();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const { cart, loading, setQuantity, remove, acceptPrices, reload } = useCart();
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill from the account profile
  useEffect(() => {
    axiosAuth
      .get("/user")
      .then(({ data }) => {
        form.setFieldsValue({
          customerName: form.getFieldValue("customerName") || data.name,
          shippingAddress: form.getFieldValue("shippingAddress") || data.address,
        });
      })
      .catch(() => undefined);
  }, []);

  const onFinish = async (values: FieldType) => {
    setSubmitting(true);
    try {
      const { data } = await axiosAuth.post<Order>("/order/checkout", values);
      await reload();
      toast.success(`Order ${data.code} placed!`);
      navigate(`/orders/${data.id}`, { replace: true });
    } catch (error) {
      toast.error(apiErrorMessage(error));
      // Stock or prices may have moved: show the fresh cart
      reload();
    } finally {
      setSubmitting(false);
    }
  };

  if (!cart) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (cart.items.length === 0) {
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

  const priceChanged = cart.items.some((i) =>
    i.warnings.some((w) => w.type === "PRICE_CHANGED")
  );

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
            initialValues={{ paymentMethod: "COD" }}
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
              <Input.TextArea rows={2} placeholder="Street, ward, district, city" />
            </Form.Item>
            <Form.Item<FieldType> name="note" label="Note for the shop">
              <Input.TextArea
                rows={2}
                maxLength={500}
                showCount
                placeholder="e.g. Call before delivering"
              />
            </Form.Item>
            <Form.Item<FieldType> name="paymentMethod" label="Payment">
              <Radio.Group className="!grid w-full gap-2 sm:grid-cols-2">
                {(Object.keys(PAYMENT_METHOD_META) as PaymentMethod[]).map((m) => (
                  <Radio
                    key={m}
                    value={m}
                    className="!mr-0 rounded-lg border border-black/10 p-3"
                  >
                    <span className="flex flex-col">
                      <Typography.Text strong>{PAYMENT_METHOD_META[m].label}</Typography.Text>
                      <Typography.Text type="secondary" className="text-xs">
                        {PAYMENT_METHOD_META[m].description}
                      </Typography.Text>
                    </span>
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
            {!cart.canCheckout && (
              <Alert
                className="!mb-4"
                type="error"
                showIcon
                message="Some items can't be ordered. Fix them in your cart first."
              />
            )}
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={submitting}
              disabled={!cart.canCheckout || loading}
              block
            >
              Place order · {formatMoney(cart.total)}
            </Button>
          </Form>
        </Card>

        <Card title={`Your cart (${cart.itemCount})`} className="lg:col-span-2">
          {priceChanged && (
            <Alert
              className="!mb-3"
              type="warning"
              showIcon
              message="Some prices changed since you added them."
              action={
                <Button size="small" onClick={acceptPrices}>
                  OK
                </Button>
              }
            />
          )}
          <div className="flex flex-col divide-y divide-black/5">
            {cart.items.map((item) => (
              <div key={item.productId} className="flex gap-3 py-3 first:pt-0">
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
                      disabled={loading}
                      onClick={() => remove(item.productId)}
                    />
                  </div>
                  <CartWarnings warnings={item.warnings} />
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <InputNumber
                      size="small"
                      min={1}
                      max={100}
                      value={item.quantity}
                      disabled={loading}
                      onChange={(value) =>
                        value && value !== item.quantity && setQuantity(item.productId, value)
                      }
                    />
                    <Typography.Text>{formatMoney(item.lineTotal)}</Typography.Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-col gap-1 border-t border-black/5 pt-4">
            <div className="flex justify-between">
              <Typography.Text type="secondary">Subtotal</Typography.Text>
              <Typography.Text>{formatMoney(cart.subtotal)}</Typography.Text>
            </div>
            <div className="flex justify-between">
              <Typography.Text type="secondary">Discount</Typography.Text>
              <Typography.Text type="success">
                −{formatMoney(cart.discountTotal)}
              </Typography.Text>
            </div>
            <div className="mt-1 flex justify-between">
              <Typography.Text strong>Total</Typography.Text>
              <Typography.Text strong className="text-[18px]">
                {formatMoney(cart.total)}
              </Typography.Text>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default Checkout;
