import { pictureUrl } from "@/lib/image";
import AxiosJWTInstance from "@/InstanceAxios";
import { clearAllCart, deleteItemCart } from "@/redux/slice/cartSlice";
import { ProductProps } from "@/type";
import {
  CloseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SunOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Drawer,
  Dropdown,
  Empty,
  Grid,
  Image,
  Layout,
  List,
  Menu,
  MenuProps,
  Popover,
  Space,
  Tooltip,
  Typography,
  theme,
} from "antd";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
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

const formatMoney = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const RootDefault = () => {
  const dispath = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const cartArr = useAppSelector((state) => state.cart.cartArr);
  const cartLength = useAppSelector((state) => state.cart.numberCart);
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

  const handleDeleteItemCart = (item: ProductProps) => {
    dispath(deleteItemCart(item));
  };

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

  const overallPrice = useCallback(() => {
    return cartArr.reduce((acc, current) => {
      return acc + Number(current.basePrice) * Number(current.quantity);
    }, 0);
  }, [cartArr, cartLength]);

  const [cartOpen, setCartOpen] = useState(false);
  const goToCheckout = () => {
    setCartOpen(false);
    navigate("/checkout");
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
  const cartContent =
    cartLength > 0 ? (
      <div className="w-[340px] max-w-[85vw]">
        <List
          itemLayout="horizontal"
          dataSource={cartArr}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  key="remove"
                  type="text"
                  size="small"
                  aria-label={`Remove ${item.name}`}
                  icon={<CloseOutlined />}
                  onClick={() => handleDeleteItemCart(item)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Image
                    src={pictureUrl(item.picture, 56)}
                    preview={false}
                    width={56}
                    height={56}
                    className="rounded-md object-cover"
                  />
                }
                title={<Typography.Text strong>{item.name}</Typography.Text>}
                description={
                  <span>
                    {item.quantity} × {formatMoney(Number(item.basePrice))}
                  </span>
                }
              />
            </List.Item>
          )}
        />
        <div className="flex items-center justify-between border-t pt-3 mt-1">
          <Typography.Text type="secondary">Total</Typography.Text>
          <Typography.Text strong className="text-[16px]">
            {formatMoney(overallPrice())}
          </Typography.Text>
        </div>
        <div className="flex gap-2 mt-3">
          <Button block danger onClick={() => dispath(clearAllCart())}>
            Clear cart
          </Button>
          <Button block type="primary" onClick={goToCheckout}>
            Checkout
          </Button>
        </div>
      </div>
    ) : (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Your cart is empty"
        className="w-[240px]"
      />
    );

  return (
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
            <Popover
              open={cartOpen}
              onOpenChange={setCartOpen}
              trigger="click"
              placement="bottomRight"
              title="Shopping cart"
              content={cartContent}
            >
              <Badge count={cartLength} size="small">
                <Button
                  type="text"
                  aria-label="Cart"
                  icon={<ShoppingCartOutlined className="text-[18px]" />}
                />
              </Badge>
            </Popover>
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
  );
};

export default RootDefault;
