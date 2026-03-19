-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "dealCreatedAt" TIMESTAMP(3),
ADD COLUMN     "dealValue" DOUBLE PRECISION,
ADD COLUMN     "expectedCloseDate" TIMESTAMP(3),
ADD COLUMN     "pipedriveDealUrl" TEXT,
ADD COLUMN     "quoteFolder" TEXT;
