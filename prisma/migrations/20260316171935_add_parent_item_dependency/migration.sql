/*
  Warnings:

  - A unique constraint covering the columns `[boardId,systemRuleType,partNumber,parentItemId]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Item_boardId_systemRuleType_partNumber_key";

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "autoAdded" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_boardId_systemRuleType_partNumber_parentItemId_key" ON "Item"("boardId", "systemRuleType", "partNumber", "parentItemId");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_parentItemId_fkey" FOREIGN KEY ("parentItemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
