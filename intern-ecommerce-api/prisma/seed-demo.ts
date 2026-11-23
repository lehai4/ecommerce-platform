/**
 * Demo data for the admin dashboard: categories, products, customers and
 * ~90 days of orders with a consistent stock history.
 *
 *   npm run seed:demo         -> removes previous demo data, then creates it again
 *   npm run seed:demo:clean   -> only removes demo data
 *
 * Everything created here is marked so it can be removed safely:
 *   customers  *@demo.local     products  SKU "DEMO-..."
 *   orders     code "DM-..."    categories slug "demo-..."
 * Demo customers can sign in with the password "demo12345".
 */
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  ReviewStatus,
  Role,
  StockReason,
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
const DAYS_OF_ORDERS = 90;

// Deterministic random numbers so every run gives the same shop
let seed = 20261123;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(list: T[]): T => list[Math.floor(random() * list.length)];
const between = (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;
const money = (value: number) => Math.round(value * 100) / 100;

const CATEGORIES: { slug: string; name: string; parent?: string; description: string }[] = [
  { slug: 'demo-dien-tu', name: 'Điện tử', description: 'Thiết bị và phụ kiện điện tử' },
  { slug: 'demo-tai-nghe', name: 'Tai nghe', parent: 'demo-dien-tu', description: 'Tai nghe có dây và không dây' },
  { slug: 'demo-sac-cap', name: 'Sạc & cáp', parent: 'demo-dien-tu', description: 'Củ sạc, cáp, sạc dự phòng' },
  { slug: 'demo-giay-dep', name: 'Giày dép', description: 'Giày thể thao, sandal, dép' },
  { slug: 'demo-tui-xach', name: 'Túi xách', description: 'Balo, túi đeo, ví' },
  { slug: 'demo-gia-dung', name: 'Đồ gia dụng', description: 'Đồ dùng cho nhà bếp và phòng khách' },
];

const PRODUCTS: { name: string; category: string; price: number; discount: number; stock: number; popularity: number; status?: ProductStatus }[] = [
  { name: 'Tai nghe Bluetooth Air S1', category: 'demo-tai-nghe', price: 39, discount: 10, stock: 42, popularity: 9 },
  { name: 'Tai nghe chụp tai Studio P5', category: 'demo-tai-nghe', price: 89, discount: 0, stock: 12, popularity: 4 },
  { name: 'Tai nghe có dây Basic E2', category: 'demo-tai-nghe', price: 9.5, discount: 0, stock: 3, popularity: 6 },
  { name: 'Củ sạc nhanh 33W', category: 'demo-sac-cap', price: 15, discount: 5, stock: 60, popularity: 8 },
  { name: 'Cáp USB-C bện dù 1m', category: 'demo-sac-cap', price: 6, discount: 0, stock: 120, popularity: 10 },
  { name: 'Sạc dự phòng 10000mAh', category: 'demo-sac-cap', price: 24, discount: 15, stock: 0, popularity: 5 },
  { name: 'Giày chạy bộ Runner X', category: 'demo-giay-dep', price: 65, discount: 20, stock: 25, popularity: 7 },
  { name: 'Sandal quai ngang', category: 'demo-giay-dep', price: 18, discount: 0, stock: 4, popularity: 5 },
  { name: 'Dép đi trong nhà', category: 'demo-giay-dep', price: 7, discount: 0, stock: 80, popularity: 3 },
  { name: 'Balo laptop 15.6 inch', category: 'demo-tui-xach', price: 45, discount: 10, stock: 18, popularity: 6 },
  { name: 'Túi đeo chéo mini', category: 'demo-tui-xach', price: 22, discount: 0, stock: 2, popularity: 4 },
  { name: 'Ví da nam', category: 'demo-tui-xach', price: 19, discount: 25, stock: 35, popularity: 3 },
  { name: 'Bình giữ nhiệt 500ml', category: 'demo-gia-dung', price: 14, discount: 0, stock: 55, popularity: 8 },
  { name: 'Nồi chiên không dầu 4L', category: 'demo-gia-dung', price: 110, discount: 12, stock: 9, popularity: 3 },
  { name: 'Bộ dao nhà bếp 5 món', category: 'demo-gia-dung', price: 32, discount: 0, stock: 20, popularity: 2 },
  { name: 'Đèn ngủ cảm ứng', category: 'demo-gia-dung', price: 12, discount: 0, stock: 30, popularity: 1, status: ProductStatus.DRAFT },
];

const FIRST = ['An', 'Bình', 'Chi', 'Dũng', 'Giang', 'Hà', 'Hải', 'Hương', 'Khánh', 'Lan', 'Linh', 'Minh', 'Nam', 'Ngọc', 'Phúc', 'Quân', 'Thảo', 'Trang', 'Tuấn', 'Vy'];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Võ', 'Đặng', 'Bùi'];
const STREETS = ['Nguyễn Huệ, Q.1, TP.HCM', 'Lê Lợi, Q.1, TP.HCM', 'Cầu Giấy, Hà Nội', 'Hai Bà Trưng, Hà Nội', 'Ninh Kiều, Cần Thơ', 'Hải Châu, Đà Nẵng', 'Thủ Đức, TP.HCM', 'Bình Thạnh, TP.HCM'];

async function clean() {
  const orders = await prisma.order.deleteMany({ where: { code: { startsWith: 'DM-' } } });
  const products = await prisma.product.deleteMany({ where: { sku: { startsWith: 'DEMO-' } } });
  const users = await prisma.user.deleteMany({ where: { email: { endsWith: '@demo.local' } } });
  // Children first so the parent can be deleted
  const categories = await prisma.category.deleteMany({
    where: { slug: { startsWith: 'demo-' }, parentId: { not: null } },
  });
  const topCategories = await prisma.category.deleteMany({ where: { slug: { startsWith: 'demo-' } } });
  console.log(
    `Removed demo data: ${orders.count} orders, ${products.count} products, ` +
      `${users.count} customers, ${categories.count + topCategories.count} categories`,
  );
}

const slugOf = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

async function create() {
  const now = Date.now();

  // Categories
  const categoryIds = new Map<string, string>();
  for (const c of CATEGORIES) {
    const category = await prisma.category.create({
      data: {
        slug: c.slug,
        name: c.name,
        description: c.description,
        parentId: c.parent ? categoryIds.get(c.parent) : null,
      },
    });
    categoryIds.set(c.slug, category.id);
  }

  // Customers
  const password = await hash('demo12345', 10);
  const customers = [];
  const phones = new Map<string, string>();
  for (let i = 1; i <= 28; i++) {
    const name = `${pick(LAST)} ${pick(FIRST)}`;
    customers.push(
      await prisma.user.create({
        data: {
          email: `kh${String(i).padStart(2, '0')}@demo.local`,
          password,
          name,
          address: `${between(1, 300)} ${pick(STREETS)}`,
          role: Role.USER,
          createdAt: new Date(now - between(5, 120) * DAY),
        },
      }),
    );
    phones.set(customers[customers.length - 1].id, `09${String(between(10000000, 99999999))}`);
  }

  // Orders (in memory first, to build a consistent stock history)
  type Line = { index: number; quantity: number };
  type PlannedOrder = { at: number; customer: typeof customers[number]; lines: Line[]; status: OrderStatus; cancelledAt?: number };
  const weights = PRODUCTS.flatMap((p, index) =>
    p.status === ProductStatus.DRAFT ? [] : Array(p.popularity).fill(index),
  );
  const planned: PlannedOrder[] = [];
  for (let day = DAYS_OF_ORDERS; day >= 0; day--) {
    // more orders on recent days and weekends
    const date = new Date(now - day * DAY);
    const weekend = [0, 6].includes(date.getDay());
    const count = between(0, 3) + (day < 30 ? 1 : 0) + (weekend ? 1 : 0);
    for (let n = 0; n < count; n++) {
      const at = now - day * DAY - between(0, 20 * 60) * 60 * 1000;
      const customer = pick(customers.filter((c) => c.createdAt.getTime() < at) ?? customers) ?? customers[0];
      const lines: Line[] = [];
      for (let l = between(1, 3); l > 0; l--) {
        const index = pick(weights);
        if (!lines.some((x) => x.index === index)) lines.push({ index, quantity: between(1, 3) });
      }
      const ageDays = (now - at) / DAY;
      const roll = random();
      let status: OrderStatus;
      if (roll < 0.08) status = OrderStatus.CANCELLED;
      else if (ageDays > 7) status = OrderStatus.DELIVERED;
      else if (ageDays > 4) status = pick([OrderStatus.DELIVERED, OrderStatus.SHIPPING]);
      else if (ageDays > 1) status = pick([OrderStatus.CONFIRMED, OrderStatus.SHIPPING]);
      else status = pick([OrderStatus.PENDING, OrderStatus.PENDING, OrderStatus.CONFIRMED]);
      planned.push({
        at,
        customer,
        lines,
        status,
        cancelledAt: status === OrderStatus.CANCELLED ? at + between(1, 30) * 60 * 60 * 1000 : undefined,
      });
    }
  }
  planned.sort((a, b) => a.at - b.at);

  // Stock: start high enough so that, after every sale, the final stock is the one in PRODUCTS
  const sold = PRODUCTS.map(() => 0);
  for (const o of planned) {
    if (o.status === OrderStatus.CANCELLED) continue;
    for (const l of o.lines) sold[l.index] += l.quantity;
  }
  const firstOrderAt = planned[0]?.at ?? now;
  const products = [];
  for (const [index, p] of PRODUCTS.entries()) {
    const salePrice = money(p.price * (1 - p.discount / 100));
    const initialStock = p.stock + sold[index];
    const createdAt = new Date(firstOrderAt - between(3, 20) * DAY);
    const product = await prisma.product.create({
      data: {
        name: p.name,
        urlName: `${slugOf(p.name)}-demo`,
        sku: `DEMO-${String(index + 1).padStart(3, '0')}`,
        searchText: `${slugOf(p.name)} demo-${String(index + 1).padStart(3, '0')}`,
        description: `Sản phẩm mẫu: ${p.name}.`,
        basePrice: p.price,
        discountPercentage: p.discount,
        salePrice,
        stock: p.stock,
        soldCount: sold[index],
        status: p.status ?? ProductStatus.ACTIVE,
        createdAt,
        categories: { connect: [{ id: categoryIds.get(p.category) }] },
      },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        change: initialStock,
        stockAfter: initialStock,
        reason: StockReason.INITIAL,
        note: 'Demo data',
        createdAt,
      },
    });
    products.push({ ...product, salePrice, current: initialStock });
  }

  // Write orders and their history; stock movements are collected and written after
  type StockEvent = { at: number; index: number; change: number; reason: StockReason; orderId: string; userId: string | null };
  const events: StockEvent[] = [];
  const reviewCandidates: { productId: string; userId: string; orderId: string; deliveredAt: number }[] = [];
  let written = 0;
  for (const o of planned) {
    const items = o.lines.map((l) => {
      const p = products[l.index];
      const base = Number(p.basePrice);
      return {
        productId: p.id,
        productName: p.name,
        basePrice: base,
        discountPercentage: p.discountPercentage,
        unitPrice: p.salePrice,
        quantity: l.quantity,
        lineTotal: money(p.salePrice * l.quantity),
        subtotal: money(base * l.quantity),
      };
    });
    const total = money(items.reduce((s, i) => s + i.lineTotal, 0));
    const subtotal = money(items.reduce((s, i) => s + i.subtotal, 0));
    const at = new Date(o.at);
    const flow: OrderStatus[] =
      o.status === OrderStatus.CANCELLED
        ? [OrderStatus.PENDING, OrderStatus.CANCELLED]
        : [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED].slice(
            0,
            [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPING, OrderStatus.DELIVERED].indexOf(o.status) + 1,
          );
    const date = new Date(o.at);
    const code = `DM-${String(date.getFullYear() % 100).padStart(2, '0')}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(++written).padStart(4, '0')}`;

    // ~30% pay by bank transfer (paid before being confirmed); COD is paid on delivery
    const transfer = random() < 0.3;
    const paid =
      o.status !== OrderStatus.CANCELLED &&
      (o.status === OrderStatus.DELIVERED || (transfer && o.status !== OrderStatus.PENDING));

    const order = await prisma.order.create({
      data: {
        code,
        userId: o.customer.id,
        status: o.status,
        paymentMethod: transfer ? PaymentMethod.BANK_TRANSFER : PaymentMethod.COD,
        paymentStatus: paid ? PaymentStatus.PAID : PaymentStatus.UNPAID,
        paidAt: paid ? new Date(o.at + (o.status === OrderStatus.DELIVERED && !transfer ? (flow.length - 1) * DAY * 0.8 : 2 * 60 * 60 * 1000)) : null,
        customerName: o.customer.name ?? 'Khách demo',
        phone: phones.get(o.customer.id) ?? '0900000000',
        shippingAddress: o.customer.address ?? pick(STREETS),
        subtotal,
        discountTotal: money(subtotal - total),
        total,
        createdAt: at,
        updatedAt: new Date(o.cancelledAt ?? o.at + (flow.length - 1) * DAY),
        items: {
          create: items.map(({ subtotal: _s, ...i }) => ({
            ...i,
            basePrice: new Prisma.Decimal(i.basePrice),
            unitPrice: new Prisma.Decimal(i.unitPrice),
            lineTotal: new Prisma.Decimal(i.lineTotal),
          })),
        },
        history: {
          create: flow.map((status, step) => ({
            status,
            changedById: step === 0 ? o.customer.id : null,
            createdAt:
              status === OrderStatus.CANCELLED && o.cancelledAt
                ? new Date(o.cancelledAt)
                : new Date(o.at + step * DAY * 0.8),
          })),
        },
      },
    });

    if (o.status === OrderStatus.DELIVERED) {
      for (const l of o.lines) {
        reviewCandidates.push({
          productId: products[l.index].id,
          userId: o.customer.id,
          orderId: order.id,
          deliveredAt: o.at + (flow.length - 1) * DAY * 0.8,
        });
      }
    }
    for (const l of o.lines) {
      events.push({ at: o.at, index: l.index, change: -l.quantity, reason: StockReason.SALE, orderId: order.id, userId: o.customer.id });
      if (o.cancelledAt) {
        events.push({ at: o.cancelledAt, index: l.index, change: l.quantity, reason: StockReason.ORDER_CANCELLED, orderId: order.id, userId: null });
      }
    }
  }

  // Reviews: about 45% of delivered products get one
  const COMMENTS: Record<number, string[]> = {
    5: ['Rất hài lòng, sẽ mua lại!', 'Chất lượng tốt, giao hàng nhanh.', 'Đúng mô tả, đóng gói cẩn thận.', 'Tuyệt vời, đáng tiền.'],
    4: ['Sản phẩm tốt, giá hợp lý.', 'Ổn, giao hơi chậm một chút.', 'Dùng ổn, sẽ giới thiệu bạn bè.'],
    3: ['Tạm được so với giá.', 'Bình thường, không có gì đặc biệt.'],
    2: ['Chất lượng chưa như mong đợi.', 'Giao hàng chậm, hộp bị móp.'],
    1: ['Sản phẩm lỗi, cần đổi trả.', 'Không giống hình.'],
  };
  const REPLIES = ['Cảm ơn bạn đã ủng hộ shop!', 'Shop rất tiếc về trải nghiệm này, vui lòng inbox để được hỗ trợ đổi trả.', 'Cảm ơn góp ý của bạn, shop sẽ cải thiện.'];
  const reviews = [];
  for (const r of reviewCandidates) {
    if (random() > 0.45) continue;
    const roll = random();
    const rating = roll < 0.5 ? 5 : roll < 0.8 ? 4 : roll < 0.92 ? 3 : roll < 0.97 ? 2 : 1;
    const at = new Date(Math.min(r.deliveredAt + between(1, 72) * 60 * 60 * 1000, now - 60 * 1000));
    const replied = rating <= 2 || random() < 0.25;
    reviews.push({
      productId: r.productId,
      userId: r.userId,
      orderId: r.orderId,
      rating,
      comment: random() < 0.8 ? pick(COMMENTS[rating]) : null,
      status: rating === 1 && random() < 0.5 ? ReviewStatus.HIDDEN : ReviewStatus.VISIBLE,
      reply: replied ? pick(rating <= 2 ? REPLIES.slice(1) : REPLIES.slice(0, 1)) : null,
      repliedAt: replied ? new Date(Math.min(at.getTime() + 6 * 60 * 60 * 1000, now)) : null,
      createdAt: at,
    });
  }
  await prisma.review.createMany({ data: reviews });
  for (const p of products) {
    const stats = await prisma.review.aggregate({
      where: { productId: p.id, status: ReviewStatus.VISIBLE },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await prisma.product.update({
      where: { id: p.id },
      data: {
        ratingAverage: Math.round((stats._avg.rating ?? 0) * 10) / 10,
        ratingCount: stats._count._all,
      },
    });
  }

  // Stock history in time order, so "stock after" is right at every point
  events.sort((a, b) => a.at - b.at);
  const rows = events.map((e) => {
    const p = products[e.index];
    p.current += e.change;
    return {
      productId: p.id,
      change: e.change,
      stockAfter: p.current,
      reason: e.reason,
      orderId: e.orderId,
      userId: e.userId,
      createdAt: new Date(e.at),
    };
  });
  await prisma.stockMovement.createMany({ data: rows });

  console.log(
    `Created demo data: ${CATEGORIES.length} categories, ${products.length} products, ` +
      `${customers.length} customers, ${planned.length} orders over ${DAYS_OF_ORDERS} days, ${reviews.length} reviews`,
  );
}

async function main() {
  await clean();
  if (!process.argv.includes('--clean')) {
    await create();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
