import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { intLiteral, table } from 'src/util/raw-sql';
import {
  CustomerSort,
  FindCustomersDto,
} from './dto/find-customers.dto';

const SORT_SQL: Record<CustomerSort, string> = {
  newest: 'u."createdAt" DESC',
  oldest: 'u."createdAt" ASC',
  spent_desc: 'spent DESC, u."createdAt" DESC',
  orders_desc: 'orders DESC, u."createdAt" DESC',
  last_order_desc: '"lastOrderAt" DESC NULLS LAST, u."createdAt" DESC',
  name_asc: 'lower(COALESCE(u."name", u."email")) ASC',
};

interface CustomerRow {
  id: string;
  email: string;
  name: string | null;
  address: string | null;
  role: Role;
  createdAt: Date;
  blockedAt: Date | null;
  orders: bigint;
  spent: Prisma.Decimal;
  lastOrderAt: Date | null;
}

/** Customers (users) with their buying stats, for admins */
@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Customers with order count, total spent and last order date */
  async findAll({
    search,
    role,
    state,
    sort = 'newest',
    page = 1,
    offset = 20,
  }: FindCustomersDto) {
    const conditions: Prisma.Sql[] = [];
    const term = search?.trim();
    if (term) {
      const like = `%${term}%`;
      conditions.push(Prisma.sql`(
        u."email" ILIKE ${like} OR u."name" ILIKE ${like}
        OR EXISTS (SELECT 1 FROM ${table('Order')} so
                   WHERE so."userId" = u."id" AND so."phone" ILIKE ${like})
      )`);
    }
    if (role) conditions.push(Prisma.sql`u."role" = ${role}::"Role"`);
    if (state === 'blocked') conditions.push(Prisma.sql`u."blockedAt" IS NOT NULL`);
    if (state === 'active') conditions.push(Prisma.sql`u."blockedAt" IS NULL`);
    const where = conditions.length
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

    const [rows, [{ count }]] = await Promise.all([
      this.prisma.$queryRaw<CustomerRow[]>`
        SELECT u."id", u."email", u."name", u."address", u."role",
               u."createdAt", u."blockedAt",
               COALESCE(s.orders, 0) AS orders,
               COALESCE(s.spent, 0) AS spent,
               s."lastOrderAt"
        FROM ${table('User')} u
        LEFT JOIN (
          SELECT "userId",
                 COUNT(*) FILTER (WHERE "status" <> 'CANCELLED') AS orders,
                 SUM("total") FILTER (WHERE "status" <> 'CANCELLED') AS spent,
                 MAX("createdAt") AS "lastOrderAt"
          FROM ${table('Order')}
          GROUP BY "userId"
        ) s ON s."userId" = u."id"
        ${where}
        ORDER BY ${Prisma.raw(SORT_SQL[sort])}
        LIMIT ${intLiteral(offset)} OFFSET ${intLiteral((page - 1) * offset)}
      `,
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count FROM ${table('User')} u ${where}
      `,
    ]);

    return {
      data: rows.map((r) => ({
        ...r,
        orders: Number(r.orders),
        spent: Math.round(Number(r.spent ?? 0) * 100) / 100,
      })),
      total: Number(count),
      page,
      offset,
    };
  }

  /** One customer with stats, addresses used and recent orders */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        address: true,
        role: true,
        createdAt: true,
        blockedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Customer not found');

    const notCancelled = { userId: id, status: { not: OrderStatus.CANCELLED } };
    const [stats, cancelled, recentOrders, addresses] = await Promise.all([
      this.prisma.order.aggregate({
        where: notCancelled,
        _count: { _all: true },
        _sum: { total: true },
        _min: { createdAt: true },
        _max: { createdAt: true },
      }),
      this.prisma.order.count({
        where: { userId: id, status: OrderStatus.CANCELLED },
      }),
      this.prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { _count: { select: { items: true } } },
      }),
      this.prisma.$queryRaw<
        { customerName: string; phone: string; shippingAddress: string; lastUsedAt: Date; times: bigint }[]
      >`
        SELECT "customerName", "phone", "shippingAddress",
               MAX("createdAt") AS "lastUsedAt", COUNT(*) AS times
        FROM ${table('Order')}
        WHERE "userId" = ${id}
        GROUP BY "customerName", "phone", "shippingAddress"
        ORDER BY "lastUsedAt" DESC
        LIMIT 10
      `,
    ]);

    const orders = stats._count._all;
    const spent = Number(stats._sum.total ?? 0);
    return {
      ...user,
      stats: {
        orders,
        cancelledOrders: cancelled,
        spent,
        averageOrderValue: orders ? Math.round((spent / orders) * 100) / 100 : 0,
        firstOrderAt: stats._min.createdAt,
        lastOrderAt: stats._max.createdAt,
      },
      addresses: addresses.map((a) => ({ ...a, times: Number(a.times) })),
      recentOrders,
    };
  }

  /** Makes a user an admin or a regular customer */
  async updateRole(id: string, role: Role, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot change your own role');
    }
    await this.assertExists(id);
    await this.prisma.user.update({ where: { id }, data: { role } });
    return this.findOne(id);
  }

  /** Locks or unlocks an account. Locking also signs the user out everywhere. */
  async setBlocked(id: string, blocked: boolean, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot lock your own account');
    }
    await this.assertExists(id);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { blockedAt: blocked ? new Date() : null },
      }),
      ...(blocked
        ? [this.prisma.userTokens.deleteMany({ where: { userId: id } })]
        : []),
    ]);
    return this.findOne(id);
  }

  private async assertExists(id: string) {
    const count = await this.prisma.user.count({ where: { id } });
    if (!count) throw new NotFoundException('Customer not found');
  }
}
