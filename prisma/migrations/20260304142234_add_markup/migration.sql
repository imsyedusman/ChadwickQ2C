/*
  Warnings:

  - A unique constraint covering the columns `[partNumber]` on the table `CatalogItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "components" JSONB;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "overrideMarkupPct" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "markupPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
ALTER COLUMN "overheadPct" SET DEFAULT 0.10,
ALTER COLUMN "engineeringPct" SET DEFAULT 0.00,
ALTER COLUMN "targetMarginPct" SET DEFAULT 0.068;

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_partNumber_key" ON "CatalogItem"("partNumber");
