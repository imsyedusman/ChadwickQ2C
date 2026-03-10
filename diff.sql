-- DropIndex
DROP INDEX "Quote_quoteNumber_key";

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_revision_key" ON "Quote"("quoteNumber", "revision");

