import AxiosJWTInstance from "@/InstanceAxios";
import ImagePicker from "@/components/product/ImagePicker";
import { useAppSelector } from "@/hook/useHookRedux";
import { pictureUrl } from "@/lib/image";
import { slugify } from "@/lib/slugify";
import type { CategoryNode } from "@/type";
import { DeleteOutlined } from "@ant-design/icons";
import {
  Button,
  Card,
  Form,
  Input,
  Space,
  TreeSelect,
  Typography,
} from "antd";
import { useEffect, useState } from "react";

export type CategoryFormValues = {
  name: string;
  slug?: string;
  description?: string | null;
  parentId?: string | null;
};

/** What to do with the image when saving */
export type CategoryImageChange =
  | { type: "keep" }
  | { type: "upload"; file: File }
  | { type: "remove" };

type Props = {
  /** Category being edited; omit to create */
  categoryId?: string;
  initialValues?: CategoryFormValues;
  currentImage?: string | null;
  submitText: string;
  submitting?: boolean;
  onSubmit: (values: CategoryFormValues, image: CategoryImageChange) => void;
};

type TreeOption = {
  value: string;
  title: string;
  children?: TreeOption[];
};

/** Tree for the parent picker, without the category itself and its children */
const toOptions = (nodes: CategoryNode[], excludeId?: string): TreeOption[] =>
  nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => ({
      value: n.id,
      title: n.name,
      children: toOptions(n.children, excludeId),
    }));

/** Shared create / edit form for categories */
const CategoryForm = ({
  categoryId,
  initialValues,
  currentImage,
  submitText,
  submitting,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<CategoryFormValues>();
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const axiosAuth = AxiosJWTInstance({ user });
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const isEdit = !!categoryId;
  const name = Form.useWatch("name", form);
  const slug = Form.useWatch("slug", form);
  const previewSlug = slug || (isEdit ? initialValues?.slug : slugify(name ?? ""));
  const shownImage = removeImage ? undefined : currentImage ?? undefined;

  useEffect(() => {
    axiosAuth
      .get<CategoryNode[]>("/category/tree")
      .then(({ data }) => setTree(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (initialValues) form.setFieldsValue(initialValues);
  }, [initialValues]);

  const reset = () => {
    form.resetFields();
    if (initialValues) form.setFieldsValue(initialValues);
    setFile(null);
    setRemoveImage(false);
  };

  const imageChange = (): CategoryImageChange =>
    file ? { type: "upload", file } : removeImage ? { type: "remove" } : { type: "keep" };

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark="optional"
      initialValues={initialValues}
      onFinish={(values) =>
        onSubmit(
          {
            name: values.name,
            slug: values.slug || undefined,
            description: values.description?.trim() || null,
            parentId: values.parentId || null,
          },
          imageChange()
        )
      }
      disabled={submitting}
      autoComplete="off"
    >
      <div className="grid max-w-5xl gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Form.Item<CategoryFormValues>
            name="name"
            label="Category name"
            rules={[{ required: true, message: "Please enter a name" }]}
          >
            <Input size="large" placeholder="e.g. Áo thun" />
          </Form.Item>
          <Form.Item<CategoryFormValues>
            name="slug"
            label="URL slug"
            normalize={(value: string) => slugify(value ?? "", true)}
            extra={
              <Typography.Text type="secondary" className="text-xs">
                Link in the shop: /category/
                <Typography.Text strong className="!text-inherit">
                  {previewSlug || "…"}
                </Typography.Text>
                {isEdit
                  ? " · changing it breaks links that were already shared"
                  : " · leave empty to create it from the name"}
              </Typography.Text>
            }
          >
            <Input size="large" placeholder={slugify(name ?? "") || "ao-thun"} />
          </Form.Item>
          <Form.Item<CategoryFormValues>
            name="parentId"
            label="Parent category"
            tooltip="Leave empty for a top level category"
          >
            <TreeSelect
              size="large"
              allowClear
              showSearch
              treeNodeFilterProp="title"
              treeDefaultExpandAll
              placeholder="None (top level)"
              treeData={toOptions(tree, categoryId)}
            />
          </Form.Item>
          <Form.Item<CategoryFormValues>
            name="description"
            label="Description"
            className="!mb-0"
          >
            <Input.TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder="Shown at the top of the category page in the shop"
            />
          </Form.Item>
        </Card>

        <Card title="Image">
          <ImagePicker
            value={file}
            currentUrl={shownImage ? pictureUrl(shownImage, 400) : undefined}
            onChange={(next) => {
              setFile(next);
              if (next) setRemoveImage(false);
            }}
            height={180}
          />
          {shownImage && !file && (
            <Button
              danger
              type="link"
              icon={<DeleteOutlined />}
              className="!px-0 mt-2"
              onClick={() => setRemoveImage(true)}
            >
              Remove image
            </Button>
          )}
          {removeImage && (
            <Typography.Text type="secondary" className="mt-2 block text-xs">
              The image will be removed when you save.{" "}
              <a onClick={() => setRemoveImage(false)}>Undo</a>
            </Typography.Text>
          )}
        </Card>
      </div>

      <div className="mt-6 flex max-w-5xl justify-end">
        <Space>
          <Button onClick={reset}>Reset</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {submitText}
          </Button>
        </Space>
      </div>
    </Form>
  );
};

export default CategoryForm;
