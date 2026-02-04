-- AlterTable
ALTER TABLE "CatalogItem" ADD COLUMN     "productFrame" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "isSystemManaged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "partNumber" TEXT,
ADD COLUMN     "productFrame" TEXT;

-- CreateTable
CREATE TABLE "MccbTripBaseRule" (
    "id" TEXT NOT NULL,
    "tripPartNumber" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "basePartNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MccbTripBaseRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MccbTripBaseRule_tripPartNumber_variant_key" ON "MccbTripBaseRule"("tripPartNumber", "variant");
