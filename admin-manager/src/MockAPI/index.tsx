import {
  HomeOutlined,
  MergeCellsOutlined,
  ProductOutlined,
  ReadOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  TeamOutlined,
  StarOutlined,
} from "@ant-design/icons";

export const routerAdmin = [
  {
    id: 0,
    path: "/",
    content: "Dashboard",
    icon: <HomeOutlined />,
  },
  {
    id: 1,
    path: "/product-list",
    content: "Products",
    icon: <ProductOutlined />,
  },
  {
    id: 2,
    path: "/category",
    content: "Categories",
    icon: <MergeCellsOutlined />,
  },
  {
    id: 3,
    path: "/order",
    content: "Orders",
    icon: <ShoppingCartOutlined />,
  },
  {
    id: 4,
    path: "/inventory",
    content: "Inventory",
    icon: <DatabaseOutlined />,
  },
  {
    id: 5,
    path: "/customer",
    content: "Customers",
    icon: <TeamOutlined />,
  },
  {
    id: 6,
    path: "/review",
    content: "Reviews",
    icon: <StarOutlined />,
  },
];
export const routerUser = [
  {
    id: 0,
    path: "/",
    content: "Home",
    icon: <HomeOutlined />,
  },
  {
    id: 1,
    path: "/product-detail",
    content: "Product Detail",
    icon: <ReadOutlined />,
  },
];
