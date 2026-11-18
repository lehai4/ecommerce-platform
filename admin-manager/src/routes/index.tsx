import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import {
  AppstoreAddOutlined,
  ArrowRightOutlined,
  MergeCellsOutlined,
  ProductOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Card, Typography } from "antd";
import { Link } from "react-router-dom";

const shortcuts = [
  {
    to: "/product-list",
    title: "Products",
    description: "Create, edit and update pictures of products.",
    icon: <ProductOutlined />,
    color: "bg-indigo-500/15 text-indigo-500",
  },
  {
    to: "/category",
    title: "Categories",
    description: "Organise products into categories.",
    icon: <MergeCellsOutlined />,
    color: "bg-emerald-500/15 text-emerald-500",
  },
  {
    to: "/order",
    title: "Orders",
    description: "Confirm, ship and track customer orders.",
    icon: <AppstoreAddOutlined />,
    color: "bg-amber-500/15 text-amber-500",
  },
  {
    to: "/profile",
    title: "Profile",
    description: "View and update your account details.",
    icon: <UserOutlined />,
    color: "bg-sky-500/15 text-sky-500",
  },
];

export default function Index() {
  const user = useAppSelector((state) => state.auth.login.currentUser);
  const name = user?.user?.name || "Admin";

  return (
    <>
      <Helmet title="Home">
        <></>
      </Helmet>
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Here is a quick way into each part of the management system."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item) => (
          <Link key={item.to} to={item.to} className="group">
            <Card hoverable className="h-full">
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-[20px] ${item.color}`}
              >
                {item.icon}
              </div>
              <Typography.Title level={5} style={{ marginBottom: 4 }}>
                {item.title}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {item.description}
              </Typography.Paragraph>
              <Typography.Text className="!text-indigo-600 font-medium">
                Open{" "}
                <ArrowRightOutlined className="transition-transform group-hover:translate-x-1" />
              </Typography.Text>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
