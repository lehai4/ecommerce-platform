-- CreateEnum
CREATE TYPE "StockReason" AS ENUM ('INITIAL', 'SALE', 'ORDER_CANCELLED', 'RESTOCK', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "blockedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "change" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reason" "StockReason" NOT NULL,
    "note" TEXT,
    "orderId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- History starts now: one INITIAL entry with the current stock of every product
INSERT INTO "StockMovement" ("id", "productId", "change", "stockAfter", "reason", "note")
SELECT gen_random_uuid()::text, "id", "stock", "stock", 'INITIAL', 'Stock when history tracking started'
FROM "Product"
WHERE "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "StockMovement_productId_createdAt_idx" ON "StockMovement"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_reason_idx" ON "StockMovement"("reason");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
