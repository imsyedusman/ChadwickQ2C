-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "dependencySources" JSONB,
ADD COLUMN     "manualQuantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
ADD COLUMN     "requiredQty" DECIMAL(10,3) NOT NULL DEFAULT 0;
