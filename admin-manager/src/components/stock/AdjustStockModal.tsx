import AxiosJWTInstance from "@/InstanceAxios";
import { STOCK_REASON_META } from "@/constants/stock";
import { useAppSelector } from "@/hook/useHookRedux";
import { apiErrorMessage } from "@/lib/apiError";
import { Form, Input, InputNumber, Modal, Radio, Typography } from "antd";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

type Values = {
  direction: "add" | "remove";
  quantity: number;
  reason: "RESTOCK" | "ADJUSTMENT";
  note?: string;
};

type Props = {
  product?: { id: string; name: string; stock: number };
  onClose: () => void;
  /** Called with the new stock after a successful change */
  onDone: (stock: number) => void;
};

/** Add or remove stock with a reason; every change is kept in the stock history */
const AdjustStockModal = ({ product, onClose, onDone }: Props) => {
  const [form] = Form.useForm<Values>();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [saving, setSaving] = useState(false);

  const direction = Form.useWatch("direction", form);
  const quantity = Form.useWatch("quantity", form) || 0;
  const after = product
    ? product.stock + (direction === "remove" ? -quantity : quantity)
    : 0;

  useEffect(() => {
    if (product) {
      form.setFieldsValue({ direction: "add", quantity: undefined, reason: "RESTOCK", note: "" });
    }
  }, [product?.id]);

  const onFinish = async (values: Values) => {
    if (!product) return;
    setSaving(true);
    try {
      const { data } = await axiosAuth.post<{ stock: number }>(
        `/stock/${product.id}/adjust`,
        {
          change: values.direction === "remove" ? -values.quantity : values.quantity,
          reason: values.reason,
          note: values.note?.trim() || undefined,
        }
      );
      toast.success(`Stock of "${product.name}" is now ${data.stock}`);
      onDone(data.stock);
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={product ? `Adjust stock · ${product.name}` : "Adjust stock"}
      open={!!product}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="Save"
      okButtonProps={{ loading: saving }}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={onFinish}
        initialValues={{ direction: "add", reason: "RESTOCK" }}
        onValuesChange={(changed: Partial<Values>) => {
          // Removing stock is usually a correction, adding usually a delivery
          if (changed.direction) {
            form.setFieldValue("reason", changed.direction === "add" ? "RESTOCK" : "ADJUSTMENT");
          }
        }}
      >
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item<Values> name="direction" label="Change">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={[
                { label: "Add", value: "add" },
                { label: "Remove", value: "remove" },
              ]}
            />
          </Form.Item>
          <Form.Item<Values>
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: "Enter a quantity" },
              {
                validator: (_, value) =>
                  direction === "remove" && product && value > product.stock
                    ? Promise.reject(new Error(`Only ${product.stock} in stock`))
                    : Promise.resolve(),
              },
            ]}
          >
            <InputNumber min={1} max={100000} precision={0} style={{ width: "100%" }} autoFocus />
          </Form.Item>
        </div>
        <Form.Item<Values> name="reason" label="Reason">
          <Radio.Group>
            {(["RESTOCK", "ADJUSTMENT"] as const).map((reason) => (
              <Radio key={reason} value={reason} className="!flex !mb-1">
                {STOCK_REASON_META[reason].label}
                <Typography.Text type="secondary" className="ml-2 text-xs">
                  {STOCK_REASON_META[reason].description}
                </Typography.Text>
              </Radio>
            ))}
          </Radio.Group>
        </Form.Item>
        <Form.Item<Values> name="note" label="Note">
          <Input.TextArea
            rows={2}
            maxLength={300}
            showCount
            placeholder="e.g. Delivery from supplier, 2 units damaged..."
          />
        </Form.Item>
      </Form>
      {product && (
        <div className="flex justify-between rounded-lg bg-black/[0.03] px-4 py-3">
          <Typography.Text type="secondary">Stock</Typography.Text>
          <Typography.Text strong>
            {product.stock} → <span className={after < 0 ? "text-red-500" : ""}>{after}</span>
          </Typography.Text>
        </div>
      )}
    </Modal>
  );
};

export default AdjustStockModal;
