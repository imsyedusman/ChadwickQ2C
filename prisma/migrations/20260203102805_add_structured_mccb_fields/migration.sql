-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "mccbRole" TEXT,
ADD COLUMN     "mccbVariant" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "mccbVariant" TEXT;
