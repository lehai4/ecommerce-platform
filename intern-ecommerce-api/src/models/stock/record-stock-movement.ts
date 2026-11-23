import { Prisma, PrismaClient, StockReason } from '@prisma/client';

type Db = Prisma.TransactionClient | PrismaClient;

/** Writes one stock history line. `stockAfter` is read from the product,
 * so call it right after the stock was changed (inside the same transaction).
 */
export async function recordStockMovement(
  db: Db,
  data: {
    productId: string;
    change: number;
    reason: StockReason;
    note?: string | null;
    orderId?: string | null;
    userId?: string | null;
  },
): Promise<void> {
  if (!data.change) return;
  const product = await db.product.findUnique({
    where: { id: data.productId },
    select: { stock: true },
  });
  await db.stockMovement.create({
    data: {
      productId: data.productId,
      change: data.change,
      stockAfter: product?.stock ?? 0,
      reason: data.reason,
      note: data.note?.trim() || null,
      orderId: data.orderId ?? null,
      userId: data.userId ?? null,
    },
  });
}
