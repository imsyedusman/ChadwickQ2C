/*
  Warnings:

  - Made the column `descriptionOptions` on table `Board` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Board" ADD COLUMN     "hideAutoDescription" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "descriptionOptions" SET NOT NULL,
ALTER COLUMN "descriptionOptions" SET DEFAULT '{}';
