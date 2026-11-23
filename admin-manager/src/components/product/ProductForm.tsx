import AxiosJWTInstance from "@/InstanceAxios";
import { formatMoney } from "@/constants/order";
import { useAppSelector } from "@/hook/useHookRedux";
import { PRODUCT_STATUSES, PRODUCT_STATUS_META } from "@/constants/product";
import type { Category, ProductProps, ProductStatus } from "@/type";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  theme,
} from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AdjustStockModal from "@/components/stock/AdjustStockModal";
import { SwapOutlined } from "@ant-design/icons";
import ProductImagesManager from "./ProductImagesManager";

export type ProductFormValues = {
  name: string;
  description?: string;
  basePrice: number;
  discountPercentage: number;
  stock: number;
  categories: string[];
  status: ProductStatus;
  sku?: string | null;
};

type ProductFormProps = {
  /** Product being edited; omit to create */
  product?: ProductProps;
  submitText: string;
  submitting?: boolean;
  /** `pendingImages`: images chosen before the product exists (create only) */
  onSubmit: (values: ProductFormValues, pendingImages: File[]) => void;
  /** Called when images of a saved product change */
  onProductChange?: (product: ProductProps) => void;
};

const toValues = (product?: ProductProps): Partial<ProductFormValues> =>
  product
    ? {
        name: product.name,
        description: product.description ?? "",
        basePrice: Number(product.basePrice),
        discountPercentage: Number(product.discountPercentage) || 0,
        stock: Number(product.stock) || 0,
        categories: (product.categories ?? []).map((c) => c.id),
        status: product.status ?? "ACTIVE",
        sku: product.sku ?? "",
      }
    : { discountPercentage: 0, stock: 0, categories: [], status: "ACTIVE" };

/** Shared create / edit form for products */
const ProductForm = ({
  product,
  submitText,
  submitting,
  onSubmit,
  onProductChange,
}: ProductFormProps) => {
  const [form] = Form.useForm<ProductFormValues>();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [adjusting, setAdjusting] = useState(false);
  const {
    token: { colorBgLayout },
  } = theme.useToken();

  const basePrice = Form.useWatch("basePrice", form);
  const discount = Form.useWatch("discountPercentage", form);
  const status = Form.useWatch("status", form);
  const finalPrice = Number(basePrice || 0) * (1 - Number(discount || 0) / 100);

  useEffect(() => {
    axiosAuth
      .get<Category[]>("/category", { params: { offset: 100 } })
      .then(({ data }) => setCategories(data))
      .catch(() => undefined);
  }, []);

  // Only when another product is loaded: image changes must not wipe unsaved edits
  useEffect(() => {
    form.setFieldsValue(toValues(product));
  }, [product?.id]);

  const reset = () => {
    form.resetFields();
    form.setFieldsValue(toValues(product));
    setPendingImages([]);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={toValues(product)}
      onFinish={(values) => {
        const cleaned = { ...values, sku: values.sku?.trim() || null };
        // Stock of a saved product only changes through Adjust (stock history)
        if (product) delete (cleaned as Partial<ProductFormValues>).stock;
        onSubmit(cleaned, pendingImages);
      }}
      disabled={submitting}
      autoComplete="off"
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card title="General">
            <Form.Item<ProductFormValues>
              name="name"
              label="Product name"
              rules={[{ required: true, message: "Please enter a name" }]}
            >
              <Input size="large" placeholder="e.g. Wireless headphones" />
            </Form.Item>
            <Form.Item<ProductFormValues>
              name="sku"
              label="SKU"
              tooltip="Your own unique code for this product, used for stock and search"
              rules={[
                {
                  pattern: /^[A-Za-z0-9._-]{0,64}$/,
                  message: 'Use letters, numbers, ".", "_" or "-" (max 64)',
                },
              ]}
            >
              <Input size="large" placeholder="e.g. TSHIRT-M-BLACK" className="sm:max-w-xs" />
            </Form.Item>
            <Form.Item<ProductFormValues>
              name="description"
              label="Description"
              className="!mb-0"
            >
              <Input.TextArea
                rows={5}
                placeholder="What makes this product great?"
                showCount
                maxLength={1000}
              />
            </Form.Item>
          </Card>

          <Card title="Pricing & stock">
            <div className="grid gap-x-4 sm:grid-cols-3">
              <Form.Item<ProductFormValues>
                name="basePrice"
                label="Base price"
                rules={[{ required: true, message: "Please enter a price" }]}
              >
                <InputNumber
                  size="large"
                  min={0}
                  step={0.5}
                  precision={2}
                  prefix="$"
                  placeholder="0.00"
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Form.Item<ProductFormValues>
                name="discountPercentage"
                label="Discount"
              >
                <InputNumber
                  size="large"
                  min={0}
                  max={100}
                  suffix="%"
                  precision={0}
                  style={{ width: "100%" }}
                />
              </Form.Item>
              <Form.Item<ProductFormValues>
                name="stock"
                label="Stock"
                rules={[{ required: true, message: "Please enter the stock" }]}
                tooltip={
                  product
                    ? "Use Adjust so every change is kept in the stock history"
                    : undefined
                }
              >
                {product ? (
                  <Space.Compact style={{ width: "100%" }}>
                    <InputNumber
                      size="large"
                      value={product.stock}
                      disabled
                      style={{ width: "100%" }}
                    />
                    <Button
                      size="large"
                      icon={<SwapOutlined />}
                      onClick={() => setAdjusting(true)}
                      disabled={false}
                    >
                      Adjust
                    </Button>
                  </Space.Compact>
                ) : (
                  <InputNumber
                    size="large"
                    min={0}
                    precision={0}
                    style={{ width: "100%" }}
                  />
                )}
              </Form.Item>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-black/[0.03] px-4 py-3">
              <Typography.Text type="secondary">Customer pays</Typography.Text>
              <Typography.Text strong className="text-[16px]">
                {formatMoney(finalPrice)}
                {Number(discount) > 0 && (
                  <Typography.Text type="secondary" delete className="ml-2 text-xs">
                    {formatMoney(basePrice)}
                  </Typography.Text>
                )}
              </Typography.Text>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card title="Status">
            <Form.Item<ProductFormValues> name="status" className="!mb-2">
              <Select
                size="large"
                options={PRODUCT_STATUSES.map((s) => ({
                  value: s,
                  label: PRODUCT_STATUS_META[s].label,
                }))}
              />
            </Form.Item>
            <Typography.Text type="secondary" className="text-xs">
              {PRODUCT_STATUS_META[(status as ProductStatus) ?? "ACTIVE"]
                ?.description}
            </Typography.Text>
          </Card>
          <Card title="Images">
            <ProductImagesManager
              product={product}
              onProductChange={onProductChange}
              pending={pendingImages}
              onPendingChange={setPendingImages}
            />
          </Card>
          <Card title="Categories">
            <Form.Item<ProductFormValues> name="categories" className="!mb-0">
              <Select
                mode="multiple"
                size="large"
                allowClear
                placeholder="Choose categories"
                optionFilterProp="label"
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
                notFoundContent={
                  <Typography.Text type="secondary">
                    No categories yet. <Link to="/category/create">Create one</Link>
                  </Typography.Text>
                }
              />
            </Form.Item>
          </Card>
        </div>
      </div>

      <div
        className="sticky bottom-0 z-10 -mx-4 mt-6 flex justify-end border-t border-black/5 px-4 py-3 sm:-mx-6 sm:px-6"
        style={{ background: colorBgLayout }}
      >
        <Space>
          <Button onClick={reset}>Reset</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {submitText}
          </Button>
        </Space>
      </div>
      <AdjustStockModal
        product={adjusting && product ? product : undefined}
        onClose={() => setAdjusting(false)}
        onDone={(stock) => {
          form.setFieldValue("stock", stock);
          if (product) onProductChange?.({ ...product, stock });
        }}
      />
    </Form>
  );
};

export default ProductForm;
