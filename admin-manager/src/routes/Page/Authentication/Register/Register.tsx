import Helmet from "@/components/Helmet";
import Logo from "@/components/Logo";
import axios from "@/lib/axios";
import {
  HomeOutlined,
  LockOutlined,
  MailOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Form, Input, Typography, type FormProps } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

type FieldType = {
  email: string;
  password: string;
  name: string;
  address: string;
};

const Register = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    await axios({ method: "POST", url: "/user", data: values })
      .then(() => {
        toast.success("Register successfully!");
        navigate("/auth/login");
      })
      .catch((error) => {
        toast.error(error.response.data.message);
      });
  };

  const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (
    errorInfo
  ) => {
    console.log("Failed:", errorInfo);
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:border-0 lg:p-0 lg:shadow-none">
      <Helmet title="Authen/register">
        <></>
      </Helmet>
      <div className="mb-8 lg:hidden">
        <Logo label="CMS" dark={false} />
      </div>
      <Typography.Title level={2} style={{ marginBottom: 4 }}>
        Create an account
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>
        Fill in your details to get started.
      </Typography.Paragraph>
      <Form
        form={form}
        name="register"
        layout="vertical"
        requiredMark={false}
        size="large"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        autoComplete="off"
      >
        <Form.Item<FieldType>
          name="email"
          label="Email"
          rules={[
            { required: true, message: "Please input your email!" },
            {
              pattern: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/,
              message: "Email format is incorrect",
            },
          ]}
        >
          <Input prefix={<MailOutlined />} placeholder="you@example.com" />
        </Form.Item>

        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item<FieldType>
            name="name"
            label="Name"
            rules={[{ required: true, message: "Please input your name" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Full name" />
          </Form.Item>
          <Form.Item<FieldType>
            label="Address"
            name="address"
            rules={[{ required: true, message: "Please input your address" }]}
          >
            <Input prefix={<HomeOutlined />} placeholder="Address" />
          </Form.Item>
        </div>

        <Form.Item<FieldType>
          name="password"
          label="Password"
          rules={[
            { required: true, message: "Please input your password" },
            {
              pattern: /^(?=.*?[0-9])(?=.*?[A-Za-z]).{8,32}$/,
              message:
                "Password needs 8-32 characters with at least one letter and one number",
            },
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Password" />
        </Form.Item>

        <Form.Item style={{ marginTop: 8 }}>
          <Button type="primary" htmlType="submit" block>
            Create account
          </Button>
        </Form.Item>
      </Form>
      <Typography.Paragraph type="secondary" className="text-center !mb-0">
        Already have an account? <Link to="/auth/login">Sign in</Link>
      </Typography.Paragraph>
    </div>
  );
};

export default Register;
