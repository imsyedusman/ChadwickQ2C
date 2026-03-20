-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "customDescription" TEXT,
ADD COLUMN     "descriptionOptions" JSONB DEFAULT '[]',
ADD COLUMN     "useCustomDescription" BOOLEAN NOT NULL DEFAULT false;
