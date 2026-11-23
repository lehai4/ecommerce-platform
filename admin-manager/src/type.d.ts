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
  ratingAverage?: number;
  ratingCount?: number;
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

export type PaymentMethod = "COD" | "BANK_TRANSFER";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export interface Order {
  id: string;
  code: string;
  userId: string | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
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

// ---------- Dashboard ----------
export interface DashboardKpis {
  revenue: number;
  sales: number;
  orders: number;
  averageOrderValue: number;
  itemsSold: number;
  newCustomers: number;
  collected: number;
  outstanding: number;
}

export interface DashboardData {
  range: {
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    timezone: string;
  };
  kpis: DashboardKpis;
  previous: DashboardKpis;
  sales: { date: string; orders: number; revenue: number; sales: number }[];
  ordersByStatus: { status: OrderStatus; count: number }[];
  topProducts: {
    productId: string | null;
    name: string;
    picture: string | null;
    quantity: number;
    revenue: number;
  }[];
  topCategories: { categoryId: string; name: string; quantity: number; revenue: number }[];
  lowStock: { id: string; name: string; sku: string | null; picture: string | null; stock: number }[];
  pendingOrders: number;
}

// ---------- Stock ----------
export type StockReason =
  | "INITIAL"
  | "SALE"
  | "ORDER_CANCELLED"
  | "RESTOCK"
  | "ADJUSTMENT";

export interface StockMovement {
  id: string;
  productId: string;
  change: number;
  stockAfter: number;
  reason: StockReason;
  note: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string | null; picture: string | null };
  user: { id: string; email: string; name: string | null } | null;
  order: { id: string; code: string } | null;
}

// ---------- Customers ----------
export interface CustomerListItem {
  id: string;
  email: string;
  name: string | null;
  address: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  blockedAt: string | null;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
}

export interface CustomerDetail extends Omit<CustomerListItem, "orders" | "spent" | "lastOrderAt"> {
  stats: {
    orders: number;
    cancelledOrders: number;
    spent: number;
    averageOrderValue: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
  };
  addresses: {
    customerName: string;
    phone: string;
    shippingAddress: string;
    lastUsedAt: string;
    times: number;
  }[];
  recentOrders: OrderListItem[];
}

// ---------- Payments ----------
export interface OrderPayment {
  orderId: string;
  code: string;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  total: string;
  bankTransfer: {
    configured: boolean;
    bankId: string;
    accountNo: string;
    accountName: string;
    amount: number;
    content: string;
    qrUrl: string | null;
  } | null;
}

// ---------- Reviews ----------
export type ReviewStatus = "VISIBLE" | "HIDDEN";

export interface Review {
  id: string;
  productId: string;
  userId: string | null;
  orderId: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
  product?: { id: string; name: string; urlName: string; picture: string | null };
  user?: { id: string; email: string; name: string | null } | null;
  order?: { id: string; code: string } | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  author: string;
}

export interface ProductReviews extends Paginated<PublicReview> {
  summary: {
    average: number;
    count: number;
    distribution: { rating: number; count: number }[];
  };
}

export interface ReviewToWrite {
  orderId: string;
  orderCode: string;
  deliveredAt: string;
  productId: string;
  productName: string;
  productPicture: string | null;
}

// ---------- Cart ----------
export type CartWarning =
  | { type: "UNAVAILABLE" }
  | { type: "OUT_OF_STOCK" }
  | { type: "NOT_ENOUGH_STOCK"; available: number }
  | { type: "PRICE_CHANGED"; previousPrice: number; currentPrice: number };

export interface CartLine {
  productId: string;
  name: string;
  urlName: string;
  picture: string | null;
  sku: string | null;
  basePrice: number;
  discountPercentage: number;
  unitPrice: number;
  quantity: number;
  stock: number;
  lineTotal: number;
  warnings: CartWarning[];
}

export interface ServerCart {
  token: string | null;
  items: CartLine[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  total: number;
  canCheckout: boolean;
}
