import { SiderTheme } from "antd/es/layout/Sider";
import React from "react";

export interface ThemeContextProp {
  themeContext: SiderTheme;
  setTheme: (theme: SiderTheme) => void;
}

export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface ProductProps {
  id: string;
  name: string;
  urlName: string;
  /** Cover = first image */
  picture: string;
  images?: ProductImage[];
  sku?: string | null;
  basePrice: string;
  discountPercentage: number;
  /** Price after discount */
  salePrice: string;
  stock: number;
  soldCount: number;
  status: ProductStatus;
  categories: Category[];
  description: string;
  createdAt?: string;
  updatedAt?: string;
  quantity?: number;
}
export type ProductSliceProps = {
  productArr: ProductProps[];
  status: boolean;
};

export interface DataType {
  key: React.Key;
  id: string;
  name: string;
  urlName: string;
  picture: string;
  basePrice: string;
  stock: number;
  discountPercentage: number;
}

export interface DataTypeCategory {
  key: React.Key;
  id: string;
  name: string;
}
export type CategorySliceProps = {
  categoryArr: Category[];
  status: boolean;
};
export interface IFormInput {
  name: string;
  basePrice: number;
  discountPercentage: number;
  stock: number;
  description: string;
  category: Category;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  parentId?: string | null;
  _count?: { products: number };
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
}
export interface DataTypeContact {
  key: React.Key;
  id: number;
  name: string;
  email: string;
  phone: string;
}
//
export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
  _v: number;
}
export enum Role {
  USER,
  ADMIN,
}

interface currentUserProps {
  user?: User | undefined;
  accessToken: string;
  refreshToken: string;
}
export interface PropLogin {
  currentUser: currentUserProps | undefined;
  isFetching: boolean;
  error: boolean;
}

export interface PropLogOut {
  isFetching: boolean;
  error: boolean;
}
export interface Token {
  accessToken: string;
  refreshToken: string;
}
//

export interface DataTypePurchase {
  key: React.key;
  id: string;
  userId: string;
  productId: string;
  amount: number;
  totalPrice: string;
  reviewNote: string | null;
  reviewComment: string | null;
  createdAt: string;
  user: {
    email: string;
  };
  product: {
    name: string;
  };
}
export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  amount: number;
  totalPrice: string;
  reviewNote: string | null;
  reviewComment: string | null;
  createdAt: string;
  user: {
    email: string;
  };
  product: {
    name: string;
  };
}

// ---------- Orders ----------
export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED";

export interface OrderItem {
  id: string;
  productId: string | null;
  productName: string;
  productPicture: string | null;
  basePrice: string;
  discountPercentage: number;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderStatusHistory {
  id: string;
  status: OrderStatus;
  note: string | null;
  changedById: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  code: string;
  userId: string | null;
  status: OrderStatus;
  customerName: string;
  phone: string;
  shippingAddress: string;
  note: string | null;
  subtotal: string;
  discountTotal: string;
  total: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  history: OrderStatusHistory[];
  user?: { id: string; email: string; name: string | null } | null;
}

export interface OrderListItem
  extends Omit<Order, "items" | "history" | "user"> {
  user: { email: string } | null;
  _count: { items: number };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  offset: number;
}

export interface OrderStatusSummary {
  status: OrderStatus;
  count: number;
  total: string;
}
