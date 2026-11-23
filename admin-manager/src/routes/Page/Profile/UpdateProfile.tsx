import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppDispatch, useAppSelector } from "@/hook/useHookRedux";
import { signOut } from "@/redux/api";
import {
  Button,
  Card,
  Divider,
  Form,
  FormProps,
  Input,
  Space,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

interface FieldType {
  name: string;
  email: string;
  address: string;
  password: string;
  currentPassword: string;
}
const UpdateProfile = () => {
  const [form] = Form.useForm();
  const dispath = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((state) => state.auth.login.currentUser);

  const axiosAuth = AxiosJWTInstance({ user });

  const [profile, setProfile] = useState<FieldType>();

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    await axiosAuth({
      method: "PATCH",
      url: "/user",
      headers: {
        Authorization: `Bearer ${user?.accessToken}`,
      },
      data: values,
    })
      .then(() => {
        toast.success("Update Profile successfully!");
        (async function LogOut() {
          await signOut({
            dispath,
            navigate,
            axiosCustom: axiosAuth,
            user,
          });
        })();
      })
      .catch((error) => {
        toast.error(error.response.data.message);
      });
  };
  const onFill = () => {
    form.setFieldsValue({
      name: profile?.name,
      email: profile?.email,
      address: profile?.address,
      password: profile?.password,
      currentPassword: profile?.currentPassword,
    });
  };
  useEffect(() => {
    onFill();
  }, [profile]);

  useEffect(() => {
    axiosAuth({
      method: "GET",
      url: "/user",
      headers: {
        Authorization: `Bearer ${user?.accessToken}`,
      },
    })
      .then((response) => {
        setProfile(response.data);
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <Helmet title="UpdateProfile">
        <></>
      </Helmet>
      <PageHeader
        title="Edit profile"
        description="You will be signed out after saving so you can sign in again."
        backTo={-1}
      />
      <Card>
        <Form
          layout="vertical"
          requiredMark="optional"
          onFinish={onFinish}
          form={form}
        >
          <Typography.Title level={5}>Personal information</Typography.Title>
          <div className="grid gap-x-6 md:grid-cols-2">
            <Form.Item<FieldType>
              name="name"
              label="Name"
              rules={[{ required: true, message: "Please input your name!" }]}
            >
              <Input size="large" placeholder="Full name" />
            </Form.Item>
            <Form.Item<FieldType>
              name="email"
              label="Email"
              rules={[{ required: true, message: "Please input your email!" }]}
            >
              <Input size="large" placeholder="you@example.com" />
            </Form.Item>
            <Form.Item<FieldType>
              name="address"
              label="Address"
              rules={[{ required: true, message: "Please input your address!" }]}
              className="md:col-span-2"
            >
              <Input size="large" placeholder="Address" />
            </Form.Item>
          </div>
          <Divider />
          <Typography.Title level={5}>Password</Typography.Title>
          <div className="grid gap-x-6 md:grid-cols-2">
            <Form.Item<FieldType>
              name="currentPassword"
              label="Current password"
              rules={[
                { required: true, message: "Please input your currentPassword!" },
              ]}
            >
              <Input.Password size="large" placeholder="Current password" />
            </Form.Item>
            <Form.Item<FieldType>
              name="password"
              label="New password"
              rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password size="large" placeholder="New password" />
            </Form.Item>
          </div>
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
    </div>
  );
};

export default UpdateProfile;
