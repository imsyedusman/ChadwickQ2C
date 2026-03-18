/*
  Warnings:

  - A unique constraint covering the columns `[pipedrive_deal_id]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "contactId" TEXT,
ADD COLUMN     "import_batch_id" TEXT,
ADD COLUMN     "pipedrive_deal_id" INTEGER,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "contactId" TEXT;

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pipedrive_org_id" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'pipedrive',
    "import_batch_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "pipedrive_person_id" INTEGER,
    "clientId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'pipedrive',
    "import_batch_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'pipedrive',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalClientsAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalContactsAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalProjectsAttempted" INTEGER NOT NULL DEFAULT 0,
    "totalClientsCommitted" INTEGER NOT NULL DEFAULT 0,
    "totalContactsCommitted" INTEGER NOT NULL DEFAULT 0,
    "totalProjectsCommitted" INTEGER NOT NULL DEFAULT 0,
    "skippedDeals" INTEGER NOT NULL DEFAULT 0,
    "errorLog" JSONB,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_pipedrive_org_id_key" ON "Client"("pipedrive_org_id");

-- CreateIndex
CREATE INDEX "Client_pipedrive_org_id_idx" ON "Client"("pipedrive_org_id");

-- CreateIndex
CREATE INDEX "Client_source_import_batch_id_idx" ON "Client"("source", "import_batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "Contact_pipedrive_person_id_key" ON "Contact"("pipedrive_person_id");

-- CreateIndex
CREATE INDEX "Contact_pipedrive_person_id_idx" ON "Contact"("pipedrive_person_id");

-- CreateIndex
CREATE INDEX "Contact_clientId_idx" ON "Contact"("clientId");

-- CreateIndex
CREATE INDEX "Contact_source_import_batch_id_idx" ON "Contact"("source", "import_batch_id");

-- CreateIndex
CREATE INDEX "ImportBatch_status_lastHeartbeatAt_idx" ON "ImportBatch"("status", "lastHeartbeatAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_pipedrive_deal_id_key" ON "Project"("pipedrive_deal_id");

-- CreateIndex
CREATE INDEX "Project_pipedrive_deal_id_idx" ON "Project"("pipedrive_deal_id");

-- CreateIndex
CREATE INDEX "Project_clientId_idx" ON "Project"("clientId");

-- CreateIndex
CREATE INDEX "Project_contactId_idx" ON "Project"("contactId");

-- CreateIndex
CREATE INDEX "Project_source_import_batch_id_idx" ON "Project"("source", "import_batch_id");

-- CreateIndex
CREATE INDEX "Quote_clientId_idx" ON "Quote"("clientId");

-- CreateIndex
CREATE INDEX "Quote_contactId_idx" ON "Quote"("contactId");

-- CreateIndex
CREATE INDEX "Quote_projectId_idx" ON "Quote"("projectId");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
