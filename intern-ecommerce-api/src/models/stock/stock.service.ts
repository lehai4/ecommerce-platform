import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { dayRange } from 'src/util/date-range';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { FindStockMovementsDto } from './dto/find-stock-movements.dto';
import { recordStockMovement } from './record-stock-movement';

const movementInclude = {
  product: { select: { id: true, name: true, sku: true, picture: true } },
  user: { select: { id: true, email: true, name: true } },
  order: { select: { id: true, code: true } },
} satisfies Prisma.StockMovementInclude;

/** Stock history and manual stock changes */
@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  /** Stock history, newest first */
  async findAll({
    productId,
    reason,
    search,
    from,
    to,
    page = 1,
    offset = 20,
  }: FindStockMovementsDto) {
    const term = search?.trim();
    const createdAt = dayRange(from, to);
    const where: Prisma.StockMovementWhereInput = {
      productId,
      reason,
      createdAt: createdAt.gte || createdAt.lt ? createdAt : undefined,
      product: term
        ? {
            OR: [
              { name: { contains: term, mode: 'insensitive' } },
              { sku: { contains: term, mode: 'insensitive' } },
            ],
          }
        : undefined,
    };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.stockMovement.count({ where }),
      this.prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * offset,
        take: offset,
      }),
    ]);
    return { data, total, page, offset };
  }

  /** Adds or removes stock by hand (restock, stock count, damaged goods...) */
  async adjust(productId: string, dto: AdjustStockDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, deletedAt: null },
        select: { id: true, stock: true },
      });
      if (!product) {
        throw new NotFoundException('Product not found');
      }

      // Removing stock only succeeds if enough is left at this moment
      const { count } = await tx.product.updateMany({
        where: {
          id: productId,
          ...(dto.change < 0 ? { stock: { gte: -dto.change } } : {}),
        },
        data: { stock: { increment: dto.change } },
      });
      if (count === 0) {
        throw new BadRequestException(
          `Cannot remove ${-dto.change}: only ${product.stock} in stock`,
        );
      }

      await recordStockMovement(tx, {
        productId,
        change: dto.change,
        reason: dto.reason,
        note: dto.note,
        userId,
      });

      return tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, stock: true },
      });
    });
  }
}
