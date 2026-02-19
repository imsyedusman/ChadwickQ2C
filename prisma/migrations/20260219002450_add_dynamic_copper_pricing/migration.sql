/*
  Warnings:

  - You are about to alter the column `quantity` on the `Item` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,3)`.

*/
-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "isCopperPriced" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalCopperWeightKgPerMeter" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "quantity" SET DEFAULT 1,
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(10,3);

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "overrideCopperPricePerKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "copperPricePerKg" DOUBLE PRECISION NOT NULL DEFAULT 15.0;
