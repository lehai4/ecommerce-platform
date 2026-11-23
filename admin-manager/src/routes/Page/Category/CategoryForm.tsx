import { slugify } from "@/lib/slugify";
import { Button, Card, Form, Input, Space, Typography } from "antd";
import { useEffect } from "react";

export type CategoryFormValues = { name: string; slug?: string };

type Props = {
  initialValues?: CategoryFormValues;
  submitText: string;
  submitting?: boolean;
  /** When editing, the slug only changes if the admin types a new one */
  isEdit?: boolean;
  onSubmit: (values: CategoryFormValues) => void;
};

/** Shared create / edit form for categories */
const CategoryForm = ({
  initialValues,
  submitText,
  submitting,
  isEdit,
  onSubmit,
}: Props) => {
  const [form] = Form.useForm<CategoryFormValues>();
  const name = Form.useWatch("name", form);
  const slug = Form.useWatch("slug", form);
  const previewSlug = slug || (isEdit ? initialValues?.slug : slugify(name ?? ""));

  useEffect(() => {
    if (initialValues) form.setFieldsValue(initialValues);
  }, [initialValues]);

  return (
    <Card className="max-w-2xl">
      <Form
        form={form}
        layout="vertical"
        requiredMark="optional"
        initialValues={initialValues}
        onFinish={(values) =>
          onSubmit({ name: values.name, slug: values.slug || undefined })
        }
        disabled={submitting}
        autoComplete="off"
      >
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
        <div className="flex justify-end">
          <Space>
            <Button onClick={() => form.resetFields()}>Reset</Button>
            <Button type="primary" htmlType="submit" loading={submitting}>
              {submitText}
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};

export default CategoryForm;
