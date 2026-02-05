-- CreateTable
CREATE TABLE "PairingRule" (
    "id" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "inputPartNumber" TEXT NOT NULL,
    "outputPartNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PairingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PairingRule_ruleType_inputPartNumber_key" ON "PairingRule"("ruleType", "inputPartNumber");

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "systemRuleType" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Item_boardId_systemRuleType_partNumber_key" ON "Item"("boardId", "systemRuleType", "partNumber");
