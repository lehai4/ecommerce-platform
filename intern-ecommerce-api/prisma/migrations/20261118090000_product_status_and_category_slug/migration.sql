-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- Category.slug: add, fill from the name (Vietnamese accents removed), then require it
ALTER TABLE "Category" ADD COLUMN "slug" TEXT;

UPDATE "Category"
SET "slug" = trim(BOTH '-' FROM regexp_replace(
  translate(lower(normalize("name", NFC)), 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),
  '[^a-z0-9]+', '-', 'g'));

UPDATE "Category" SET "slug" = 'category' WHERE "slug" IS NULL OR "slug" = '';

-- Make duplicates unique by appending a short id
UPDATE "Category" c
SET "slug" = c."slug" || '-' || substr(c."id", 1, 6)
WHERE EXISTS (
  SELECT 1 FROM "Category" o
  WHERE o."slug" = c."slug" AND o."id" < c."id"
);

ALTER TABLE "Category" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "salePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "soldCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ProductStatus" NOT NULL DEFAULT E'ACTIVE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill price after discount
UPDATE "Product"
SET "salePrice" = round("basePrice" * (100 - "discountPercentage") / 100, 2);

-- Backfill units sold from non-cancelled orders
UPDATE "Product" p
SET "soldCount" = s.sold
FROM (
  SELECT oi."productId", SUM(oi."quantity")::int AS sold
  FROM "OrderItem" oi
  JOIN "Order" o ON o."id" = oi."orderId"
  WHERE o."status" <> 'CANCELLED' AND oi."productId" IS NOT NULL
  GROUP BY oi."productId"
) s
WHERE s."productId" = p."id";

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Product_status_deletedAt_idx" ON "Product"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "Product_salePrice_idx" ON "Product"("salePrice");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "Product_soldCount_idx" ON "Product"("soldCount");
