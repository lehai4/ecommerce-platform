-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "description" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "imagePublicId" TEXT,
ADD COLUMN     "parentId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "searchText" TEXT NOT NULL DEFAULT E'',
ADD COLUMN     "sku" TEXT;

-- Accent-insensitive search text from the product name (same rules as src/util/slugify.ts)
UPDATE "Product"
SET "searchText" = trim(BOTH '-' FROM regexp_replace(
  translate(lower(normalize("name", NFC)), 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ', 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'),
  '[^a-z0-9]+', '-', 'g'));

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- Existing pictures become the first (cover) image of each product
INSERT INTO "ProductImage" ("id", "productId", "url", "publicId", "position")
SELECT
  gen_random_uuid()::text,
  p."id",
  p."picture",
  CASE
    WHEN p."picture" LIKE '%res.cloudinary.com%'
      THEN substring(p."picture" from '/upload/(?:v[0-9]+/)?(.+)\.[A-Za-z0-9]+$')
    ELSE 'local:' || substring(p."picture" from '[^/]+$')
  END,
  0
FROM "Product" p
WHERE p."picture" IS NOT NULL AND p."picture" <> '';

-- CreateIndex
CREATE INDEX "ProductImage_productId_position_idx" ON "ProductImage"("productId", "position");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
