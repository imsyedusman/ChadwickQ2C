/*
  Warnings:

  - You are about to drop the column `overrideMarkupPct` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `markupPct` on the `Settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "overrideMarkupPct";

-- AlterTable
ALTER TABLE "Settings" DROP COLUMN "markupPct",
ALTER COLUMN "overheadPct" SET DEFAULT 0.20,
ALTER COLUMN "engineeringPct" SET DEFAULT 0.20,
ALTER COLUMN "targetMarginPct" SET DEFAULT 0.18;

-- CreateTable
CREATE TABLE "QuoteSequence" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QuoteSequence_year_key" ON "QuoteSequence"("year");
