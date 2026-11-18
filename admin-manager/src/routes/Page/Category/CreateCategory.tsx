import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { Button, Card, Form, Input, Space, type FormProps } from "antd";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
type FieldType = {
  name?: string;
};
const CreateCategory = () => {
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);

  const axiosAuth = AxiosJWTInstance({ user });
  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    await axiosAuth({
      url: `/category`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${user?.accessToken}`,
      },
      data: values,
    })
      .then(() => {
        toast.success("Create Category successfully!");
        navigate("/category");
      })
      .catch((err) => {
        toast.error(err.response.data.message);
      });
  };

  return (
    <>
      <Helmet title="CreateCategory">
        <></>
      </Helmet>
      <PageHeader
        title="New category"
        description="Add a category to group your products."
        backTo="/category"
      />
      <Card className="max-w-2xl">
        <Form
          name="create-category"
          layout="vertical"
          requiredMark="optional"
          onFinish={onFinish}
          autoComplete="off"
        >
          <Form.Item<FieldType>
            name="name"
            label="Category name"
            rules={[{ required: true, message: "Please input category!" }]}
          >
            <Input size="large" placeholder="e.g. Electronics" />
          </Form.Item>
          <div className="flex justify-end">
            <Space>
              <Button htmlType="reset">Reset</Button>
              <Button type="primary" htmlType="submit">
                Create category
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </>
  );
};

export default CreateCategory;
