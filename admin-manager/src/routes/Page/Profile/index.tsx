import AxiosJWTInstance from "@/InstanceAxios";
import Helmet from "@/components/Helmet";
import PageHeader from "@/components/PageHeader";
import { useAppSelector } from "@/hook/useHookRedux";
import { EditOutlined, UserOutlined } from "@ant-design/icons";
import { Avatar, Button, Card, Descriptions, Skeleton, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface FieldType {
  name: string;
  email: string;
  address: string;
  role: string;
}
const Profile = () => {
  const user = useAppSelector((state) => state.auth.login.currentUser);

  const axiosAuth = AxiosJWTInstance({ user });
  const [profile, setProfile] = useState<FieldType>();

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
      <Helmet title="Profile">
        <></>
      </Helmet>
      <PageHeader
        title="Profile"
        description="Your account information."
        backTo={-1}
        extra={
          <Link to="/profile/update">
            <Button type="primary" icon={<EditOutlined />}>
              Edit profile
            </Button>
          </Link>
        }
      />
      <Card>
        {!profile ? (
          <Skeleton avatar active paragraph={{ rows: 3 }} />
        ) : (
          <>
            <div className="flex items-center gap-4 mb-6">
              <Avatar
                size={64}
                style={{ backgroundColor: "#4f46e5", fontSize: 26 }}
                icon={!profile.name ? <UserOutlined /> : undefined}
              >
                {profile.name?.charAt(0).toUpperCase()}
              </Avatar>
              <div className="min-w-0">
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {profile.name}
                </Typography.Title>
                <Typography.Text type="secondary">{profile.email}</Typography.Text>
              </div>
              <Tag
                color={profile.role === "ADMIN" ? "purple" : "blue"}
                className="ml-auto"
              >
                {profile.role}
              </Tag>
            </div>
            <Descriptions
              bordered
              column={1}
              labelStyle={{ width: 160 }}
              items={[
                { key: "name", label: "Name", children: profile.name },
                { key: "email", label: "Email", children: profile.email },
                { key: "address", label: "Address", children: profile.address || "—" },
                { key: "role", label: "Role", children: profile.role },
              ]}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default Profile;
