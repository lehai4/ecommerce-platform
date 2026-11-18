import Helmet from "@/components/Helmet";
import Logo from "@/components/Logo";
import { useAppDispatch } from "@/hook/useHookRedux";
import { signInUser } from "@/redux/api";
import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { Button, Form, Input, Typography, type FormProps } from "antd";
import { Link, useNavigate } from "react-router-dom";

type FieldType = {
  email?: string;
  password?: string;
};

const Login = () => {
  const navigate = useNavigate();
  const dispath = useAppDispatch();
  const [form] = Form.useForm();
  const onFinish: FormProps<FieldType>["onFinish"] = async (values) => {
    await signInUser(
      {
        email: values.email,
        password: values.password,
      },
      dispath,
      navigate
    );
  };

  const onFinishFailed: FormProps<FieldType>["onFinishFailed"] = (
    errorInfo
  ) => {
    console.log("Failed:", errorInfo);
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:border-0 lg:p-0 lg:shadow-none">
      <Helmet title="Authen/login">
        <></>
      </Helmet>
      <div className="mb-8 lg:hidden">
        <Logo label="CMS" dark={false} />
      </div>
      <Typography.Title level={2} style={{ marginBottom: 4 }}>
        Welcome back
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 28 }}>
        Sign in to continue to your dashboard.
      </Typography.Paragraph>
      <Form
        form={form}
        name="login"
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
            Sign in
          </Button>
        </Form.Item>
      </Form>
      <Typography.Paragraph type="secondary" className="text-center !mb-0">
        Don't have an account? <Link to="/auth/register">Create one</Link>
      </Typography.Paragraph>
    </div>
  );
};

export default Login;
