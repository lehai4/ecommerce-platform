import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { getCategoryByName } from "@/redux/api";
import { Category } from "@/type";

import { Button, Card, Form, Input, Space, type FormProps } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

type FieldType = {
  name?: string;
  description?: string;
  basePrice?: string;
  stock?: string;
  discountPercentage?: string;
  categories?: any;
};

const EditCategory = () => {
  const params = useParams();
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);

  const axiosAuth = AxiosJWTInstance({ user });
  const [category, setCategory] = useState<Category>();

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    const res = await axiosAuth({
      method: "PATCH",
      url: `/category/${category?.id}`,
      headers: {
        Authorization: `Bearer ${user?.accessToken}`,
      },
      data: values,
    });
    if (res.data) {
      navigate("/category");
      toast.success("Edit Category successfully!");
    } else {
      toast.error("Edit Category failed");
    }
  };
  const onFill = () => {
    form.setFieldsValue({
      name: category?.name,
    });
  };
  useEffect(() => {
    onFill();
  }, [category]);
  useEffect(() => {
    let mounted = true;
    getCategoryByName({ name: params.name as string }).then((items) => {
      if (mounted) {
        setCategory(items.data);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Helmet title="EditCategory">
        <></>
      </Helmet>
      <PageHeader
        title="Edit category"
        description={category?.name}
        backTo="/category"
      />
      <Card className="max-w-2xl">
        <Form
          layout="vertical"
          requiredMark="optional"
          initialValues={{ category }}
          onFinish={onFinish}
          form={form}
        >
          <Form.Item<FieldType>
            name="name"
            label="Category name"
            rules={[{ required: true, message: "Please input category!" }]}
          >
            <Input size="large" placeholder="Category name" />
          </Form.Item>
          <div className="flex justify-end">
            <Space>
              <Button onClick={onFill}>Reset</Button>
              <Button type="primary" htmlType="submit">
                Save changes
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </>
  );
};

export default EditCategory;
