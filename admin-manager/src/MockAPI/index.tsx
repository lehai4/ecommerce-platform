import {
  HomeOutlined,
  MergeCellsOutlined,
  ProductOutlined,
  ReadOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";

export const routerAdmin = [
  {
    id: 0,
    path: "/",
    content: "Home",
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
