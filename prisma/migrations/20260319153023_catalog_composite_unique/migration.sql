/*
  Warnings:

  - A unique constraint covering the columns `[partNumber,brand]` on the table `CatalogItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CatalogItem_partNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_partNumber_brand_key" ON "CatalogItem"("partNumber", "brand");
