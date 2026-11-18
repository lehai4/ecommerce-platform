import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import currency from 'currency.js';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { FindOrdersDto } from './dto/find-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { canTransition, ORDER_STATUS_TRANSITIONS } from './order-status';

/** What is returned for every order */
const orderInclude = {
  items: true,
  history: { orderBy: { createdAt: 'asc' } },
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.OrderInclude;

/** What is returned in order lists */
const orderListInclude = {
  user: { select: { email: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithDetails = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

/** Paginated result */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  offset: number;
}

/** Manages customer orders: checkout, stock and status tracking */
@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  /** Places an order for the logged user.
   *
   * Runs in one transaction: stock is checked and decremented atomically,
   * prices are copied from the products so later edits don't change the order.
   */
  async create(userId: string, dto: CreateOrderDto): Promise<OrderWithDetails> {
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      quantities.set(
        item.productId,
        (quantities.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const productIds = [...quantities.keys()];

    return this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException('Some products in the cart no longer exist');
      }

      let subtotal = currency(0);
      let total = currency(0);
      const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];

      for (const product of products) {
        const quantity = quantities.get(product.id);

        // Only succeeds if enough stock is left at this moment.
        const { count } = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (count === 0) {
          throw new ConflictException(
            `Not enough stock for "${product.name}" (${product.stock} left)`,
          );
        }

        const basePrice = currency(product.basePrice.toNumber());
        const unitPrice = basePrice.multiply(
          (100 - product.discountPercentage) / 100,
        );
        const lineTotal = unitPrice.multiply(quantity);

        subtotal = subtotal.add(basePrice.multiply(quantity));
        total = total.add(lineTotal);

        items.push({
          product: { connect: { id: product.id } },
          productName: product.name,
          productPicture: product.picture,
          basePrice: basePrice.value,
          discountPercentage: product.discountPercentage,
          unitPrice: unitPrice.value,
          quantity,
          lineTotal: lineTotal.value,
        });
      }

      return tx.order.create({
        data: {
          code: this.generateCode(),
          user: { connect: { id: userId } },
          customerName: dto.customerName.trim(),
          phone: dto.phone.trim(),
          shippingAddress: dto.shippingAddress.trim(),
          note: dto.note?.trim() || null,
          subtotal: subtotal.value,
          discountTotal: subtotal.subtract(total).value,
          total: total.value,
          items: { create: items },
          history: {
            create: { status: OrderStatus.PENDING, changedById: userId },
          },
        },
        include: orderInclude,
      });
    });
  }

  /** Lists orders with filters and pagination. Pass `userId` to only list one user's orders. */
  async findAll(
    { status, search, page = 1, offset = 10 }: FindOrdersDto,
    userId?: string,
  ): Promise<Paginated<Prisma.OrderGetPayload<{ include: typeof orderListInclude }>>> {
    const term = search?.trim();
    const where: Prisma.OrderWhereInput = {
      status,
      userId,
      ...(term && {
        OR: [
          { code: { contains: term, mode: 'insensitive' } },
          { customerName: { contains: term, mode: 'insensitive' } },
          { phone: { contains: term } },
        ],
      }),
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * offset,
        take: offset,
        orderBy: { createdAt: 'desc' },
        include: orderListInclude,
      }),
    ]);

    return { data, total, page, offset };
  }

  /** Number of orders and revenue per status, for dashboards and tabs */
  async summary(): Promise<
    { status: OrderStatus; count: number; total: string }[]
  > {
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { total: true },
    });

    return Object.values(OrderStatus).map((status) => {
      const group = groups.find((g) => g.status === status);
      return {
        status,
        count: group?._count._all ?? 0,
        total: group?._sum.total?.toString() ?? '0',
      };
    });
  }

  /** Returns one order. Customers can only see their own orders. */
  async findOne(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order || (userRole !== Role.ADMIN && order.userId !== userId)) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /** Admin moves an order to its next status */
  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
    adminId: string,
  ): Promise<OrderWithDetails> {
    return this.changeStatus(id, dto.status, adminId, dto.note);
  }

  /** Customer cancels their own order while it is still pending */
  async cancel(
    id: string,
    userId: string,
    note?: string,
  ): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Only pending orders can be cancelled, please contact the shop',
      );
    }

    return this.changeStatus(id, OrderStatus.CANCELLED, userId, note);
  }

  /** Changes status, records history and restores stock on cancellation */
  private async changeStatus(
    id: string,
    status: OrderStatus,
    changedById: string,
    note?: string,
  ): Promise<OrderWithDetails> {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (!canTransition(order.status, status)) {
        const allowed = ORDER_STATUS_TRANSITIONS[order.status];
        throw new BadRequestException(
          `Cannot change order from ${order.status} to ${status}` +
            (allowed.length ? ` (allowed: ${allowed.join(', ')})` : ''),
        );
      }

      if (status === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          if (!item.productId) continue; // product was deleted
          await tx.product.updateMany({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      return tx.order.update({
        where: { id },
        data: {
          status,
          history: {
            create: { status, note: note?.trim() || null, changedById },
          },
        },
        include: orderInclude,
      });
    });
  }

  /** e.g. "OD-261118-7F3K2A" */
  private generateCode(): string {
    const now = new Date();
    const date = [
      now.getFullYear() % 100,
      now.getMonth() + 1,
      now.getDate(),
    ]
      .map((n) => String(n).padStart(2, '0'))
      .join('');
    const random = randomBytes(4)
      .toString('hex')
      .toUpperCase()
      .slice(0, 6);
    return `OD-${date}-${random}`;
  }
}
