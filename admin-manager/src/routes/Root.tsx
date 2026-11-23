import AxiosJWTInstance from "@/InstanceAxios";
import CartPopover from "@/components/cart/CartPopover";
import { CartProvider } from "@/hook/useCart";
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ShoppingOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Grid,
  Layout,
  Menu,
  MenuProps,
  Space,
  Tooltip,
  theme,
} from "antd";
import { useContext, useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { routerAdmin } from "../MockAPI";
import Logo from "../components/Logo";
import { BRAND } from "../components/config";
import { ThemeContext } from "../hook/useContext";
import { useAppDispatch, useAppSelector } from "../hook/useHookRedux";
import { signOut } from "../redux/api";

const { Header, Content, Sider } = Layout;
const SIDER_WIDTH = 248;
const SIDER_COLLAPSED_WIDTH = 72;

const RootDefault = () => {
  const dispath = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const user = useAppSelector((state) => state.auth.login.currentUser);

  const axiosAuth = AxiosJWTInstance({ user });
  const role: any = user?.user?.role;
  const displayName = user?.user?.name || user?.user?.email || "User";

  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  // useBreakpoint() is empty on the first render; treat that as desktop.
  const isMobile = screens.lg === false;
  const { themeContext, setTheme } = useContext(ThemeContext);
  const {
    token: { colorBgContainer, colorBorderSecondary },
  } = theme.useToken();

  const handleLogOut = async () => {
    await signOut({
      dispath,
      navigate,
      axiosCustom: axiosAuth,
      user,
    });
  };

  const onChangeTheme = () => {
    themeContext === "dark" ? setTheme("light") : setTheme("dark");
  };

  useEffect(() => {
    localStorage.setItem("theme", themeContext);
  }, [themeContext]);

  const userMenu: MenuProps = {
    items: [
      {
        key: "profile",
        icon: <UserOutlined />,
        label: <Link to="/profile">Profile</Link>,
      },
      ...(role === "ADMIN"
        ? []
        : [
            {
              key: "orders",
              icon: <ShoppingOutlined />,
              label: <Link to="/orders">My orders</Link>,
            },
          ]),
      { type: "divider" as const },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        danger: true,
        label: "Log out",
        onClick: handleLogOut,
      },
    ],
  };

  const userButton = (
    <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
      <Button type="text" className="!h-10 !px-2">
        <Space>
          <Avatar
            size={30}
            style={{ backgroundColor: "#4f46e5" }}
            icon={<UserOutlined />}
          />
          <span className="hidden sm:inline font-medium">{displayName}</span>
        </Space>
      </Button>
    </Dropdown>
  );

  /* ---------- Admin layout ---------- */
  const selectedKey = useMemo(() => {
    const match = [...routerAdmin]
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) =>
        item.path === "/"
          ? location.pathname === "/"
          : location.pathname.startsWith(item.path)
      );
    return match ? match.path : "";
  }, [location.pathname]);

  if (role === "ADMIN") {
    const siderWidth = isMobile
      ? 0
      : collapsed
      ? SIDER_COLLAPSED_WIDTH
      : SIDER_WIDTH;
    const navMenu = (
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        onClick={({ key }) => {
          navigate(key);
          setOpen(false);
        }}
        items={routerAdmin.map((item) => ({
          key: item.path,
          icon: item.icon,
          label: item.content,
        }))}
        style={{ borderInlineEnd: "none", marginTop: 8 }}
      />
    );
    return (
      <Layout hasSider style={{ minHeight: "100vh" }}>
        {isMobile ? (
          <Drawer
            placement="left"
            open={open}
            onClose={() => setOpen(false)}
            width={SIDER_WIDTH}
            closable={false}
            styles={{ body: { padding: 0, background: BRAND.siderBg } }}
          >
            <div className="flex h-16 items-center px-6">
              <Logo />
            </div>
            {navMenu}
          </Drawer>
        ) : (
          <Sider
            className="app-sider"
            width={SIDER_WIDTH}
            collapsedWidth={SIDER_COLLAPSED_WIDTH}
            collapsible
            collapsed={collapsed}
            trigger={null}
            style={{
              overflow: "auto",
              height: "100vh",
              position: "fixed",
              left: 0,
              top: 0,
              bottom: 0,
              zIndex: 20,
            }}
          >
            <div
              className={`flex h-16 items-center ${
                collapsed ? "justify-center" : "px-6"
              }`}
            >
              <Logo collapsed={collapsed} />
            </div>
            {navMenu}
          </Sider>
        )}
        <Layout
          style={{
            marginLeft: siderWidth,
            transition: "margin-left 0.2s",
          }}
        >
          <Header
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: colorBgContainer,
              borderBottom: `1px solid ${colorBorderSecondary}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Button
              type="text"
              aria-label="Toggle menu"
              icon={
                isMobile ? (
                  <MenuOutlined />
                ) : collapsed ? (
                  <MenuUnfoldOutlined />
                ) : (
                  <MenuFoldOutlined />
                )
              }
              onClick={() =>
                isMobile ? setOpen(true) : setCollapsed(!collapsed)
              }
            />
            <Space size="small">
              <Tooltip
                title={themeContext === "dark" ? "Light mode" : "Dark mode"}
              >
                <Button
                  type="text"
                  aria-label="Toggle theme"
                  icon={
                    themeContext === "dark" ? <SunOutlined /> : <MoonOutlined />
                  }
                  onClick={onChangeTheme}
                />
              </Tooltip>
              {userButton}
            </Space>
          </Header>
          <Content className="p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[1400px]">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    );
  }

  /* ---------- User (storefront) layout ---------- */
  return (
    <CartProvider>
    <Layout style={{ minHeight: "100vh" }}>
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: colorBgContainer,
          borderBottom: `1px solid ${colorBorderSecondary}`,
          paddingInline: 0,
        }}
      >
        <div className="container px-4 h-full flex items-center justify-between gap-4">
          <Link to="/">
            <Logo label="CMS Store" dark={false} />
          </Link>
          <Space size="small">
            <CartPopover />
            <div className="hidden md:block">{userButton}</div>
            <Button
              className="md:!hidden"
              type="text"
              aria-label="Open menu"
              icon={<MenuOutlined />}
              onClick={() => setOpen(true)}
            />
          </Space>
        </div>
      </Header>
      <Content className="py-6 sm:py-8">
        <div className="container px-4">
          <Outlet />
        </div>
      </Content>
      <Drawer
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={280}
        title={displayName}
      >
        <Menu
          mode="vertical"
          selectable={false}
          style={{ borderInlineEnd: "none" }}
          onClick={() => setOpen(false)}
          items={[
            { key: "home", label: <Link to="/">Products</Link> },
            { key: "orders", label: <Link to="/orders">My orders</Link> },
            { key: "profile", label: <Link to="/profile">Profile</Link> },
            {
              key: "logout",
              danger: true,
              icon: <LogoutOutlined />,
              label: "Log out",
              onClick: handleLogOut,
            },
          ]}
        />
      </Drawer>
    </Layout>
    </CartProvider>
  );
};

export default RootDefault;
