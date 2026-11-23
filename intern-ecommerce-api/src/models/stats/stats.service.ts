import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderStatus, Prisma, ProductStatus, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  addDays,
  APP_TIMEZONE,
  dayRange,
  daysBetween,
  todayString,
} from 'src/util/date-range';
import {
  intLiteral,
  table,
  timezoneLiteral,
  tsLiteral,
} from 'src/util/raw-sql';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

const LOW_STOCK = 5;

/** Raw SQL sums come back as floats: round money to cents */
const money = (value: unknown) => Math.round(Number(value ?? 0) * 100) / 100;
const MAX_DAYS = 366;


export interface Kpis {
  /** Total of delivered orders */
  revenue: number;
  /** Total of all orders that were not cancelled */
  sales: number;
  orders: number;
  averageOrderValue: number;
  itemsSold: number;
  newCustomers: number;
}

/** Numbers for the admin dashboard */
@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard({ from, to }: DashboardQueryDto) {
    const end = to ?? todayString();
    const start = from ?? addDays(end, -29);
    const days = daysBetween(start, end);
    if (days < 1) {
      throw new BadRequestException('"from" must be before "to"');
    }
    if (days > MAX_DAYS) {
      throw new BadRequestException(`The period can be at most ${MAX_DAYS} days`);
    }
    // Previous period of the same length, just before
    const previousEnd = addDays(start, -1);
    const previousStart = addDays(previousEnd, -(days - 1));

    const [
      kpis,
      previous,
      sales,
      ordersByStatus,
      topProducts,
      topCategories,
      lowStock,
      pendingOrders,
    ] = await Promise.all([
      this.kpis(start, end),
      this.kpis(previousStart, previousEnd),
      this.dailySales(start, end),
      this.ordersByStatus(start, end),
      this.topProducts(start, end),
      this.topCategories(start, end),
      this.lowStock(),
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
    ]);

    return {
      range: { from: start, to: end, previousFrom: previousStart, previousTo: previousEnd, timezone: APP_TIMEZONE },
      kpis,
      previous,
      sales,
      ordersByStatus,
      topProducts,
      topCategories,
      lowStock,
      pendingOrders,
    };
  }

  private async kpis(from: string, to: string): Promise<Kpis> {
    const createdAt = dayRange(from, to);
    const notCancelled = { createdAt, status: { not: OrderStatus.CANCELLED } };

    const [orders, delivered, items, newCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: notCancelled,
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt, status: OrderStatus.DELIVERED },
        _sum: { total: true },
      }),
      this.prisma.orderItem.aggregate({
        where: { order: notCancelled },
        _sum: { quantity: true },
      }),
      this.prisma.user.count({ where: { createdAt, role: Role.USER } }),
    ]);

    const count = orders._count._all;
    const sales = money(orders._sum.total);
    return {
      revenue: money(delivered._sum.total),
      sales,
      orders: count,
      averageOrderValue: count ? Math.round((sales / count) * 100) / 100 : 0,
      itemsSold: items._sum.quantity ?? 0,
      newCustomers,
    };
  }

  /** One point per day (days without orders included) */
  private async dailySales(from: string, to: string) {
    const { gte, lt } = dayRange(from, to);
    const rows = await this.prisma.$queryRaw<
      { day: string; orders: bigint; revenue: Prisma.Decimal; sales: Prisma.Decimal }[]
    >`
      SELECT
        to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timezoneLiteral(APP_TIMEZONE)}, 'YYYY-MM-DD') AS day,
        COUNT(*) FILTER (WHERE "status" <> 'CANCELLED') AS orders,
        COALESCE(SUM("total") FILTER (WHERE "status" = 'DELIVERED'), 0) AS revenue,
        COALESCE(SUM("total") FILTER (WHERE "status" <> 'CANCELLED'), 0) AS sales
      FROM ${table('Order')}
      WHERE "createdAt" >= ${tsLiteral(gte)} AND "createdAt" < ${tsLiteral(lt)}
      GROUP BY 1
    `;
    const byDay = new Map(rows.map((r) => [r.day, r]));
    const result = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const row = byDay.get(day);
      result.push({
        date: day,
        orders: Number(row?.orders ?? 0),
        revenue: money(row?.revenue),
        sales: money(row?.sales),
      });
    }
    return result;
  }

  private async ordersByStatus(from: string, to: string) {
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: dayRange(from, to) },
      _count: { _all: true },
    });
    return Object.values(OrderStatus).map((status) => ({
      status,
      count: groups.find((g) => g.status === status)?._count._all ?? 0,
    }));
  }

  private async topProducts(from: string, to: string, limit = 5) {
    const { gte, lt } = dayRange(from, to);
    const rows = await this.prisma.$queryRaw<
      {
        productId: string | null;
        name: string;
        picture: string | null;
        quantity: bigint;
        revenue: Prisma.Decimal;
      }[]
    >`
      SELECT
        oi."productId",
        MAX(oi."productName") AS name,
        MAX(COALESCE(p."picture", oi."productPicture")) AS picture,
        SUM(oi."quantity") AS quantity,
        SUM(oi."lineTotal") AS revenue
      FROM ${table('OrderItem')} oi
      JOIN ${table('Order')} o ON o."id" = oi."orderId"
      LEFT JOIN ${table('Product')} p ON p."id" = oi."productId"
      WHERE o."status" <> 'CANCELLED'
        AND o."createdAt" >= ${tsLiteral(gte)} AND o."createdAt" < ${tsLiteral(lt)}
      GROUP BY oi."productId"
      ORDER BY quantity DESC, revenue DESC
      LIMIT ${intLiteral(limit)}
    `;
    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      picture: r.picture,
      quantity: Number(r.quantity),
      revenue: money(r.revenue),
    }));
  }

  private async topCategories(from: string, to: string, limit = 5) {
    const { gte, lt } = dayRange(from, to);
    const rows = await this.prisma.$queryRaw<
      { categoryId: string; name: string; quantity: bigint; revenue: Prisma.Decimal }[]
    >`
      SELECT
        c."id" AS "categoryId",
        c."name",
        SUM(oi."quantity") AS quantity,
        SUM(oi."lineTotal") AS revenue
      FROM ${table('OrderItem')} oi
      JOIN ${table('Order')} o ON o."id" = oi."orderId"
      JOIN ${table('_CategoryToProduct')} cp ON cp."B" = oi."productId"
      JOIN ${table('Category')} c ON c."id" = cp."A"
      WHERE o."status" <> 'CANCELLED'
        AND o."createdAt" >= ${tsLiteral(gte)} AND o."createdAt" < ${tsLiteral(lt)}
      GROUP BY c."id", c."name"
      ORDER BY revenue DESC
      LIMIT ${intLiteral(limit)}
    `;
    return rows.map((r) => ({
      categoryId: r.categoryId,
      name: r.name,
      quantity: Number(r.quantity),
      revenue: money(r.revenue),
    }));
  }

  /** Active products that are running out (not related to the period) */
  private lowStock(limit = 8) {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        status: ProductStatus.ACTIVE,
        stock: { lte: LOW_STOCK },
      },
      select: { id: true, name: true, sku: true, picture: true, stock: true },
      orderBy: [{ stock: 'asc' }, { soldCount: 'desc' }],
      take: limit,
    });
  }
}
