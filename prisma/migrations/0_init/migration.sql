-- Safe Idempotent Migration
-- This script safely creates tables if they don't exist and adds columns if they are missing.

-- 1. Create Tables (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS "Quote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteNumber" TEXT NOT NULL,
    "clientName" TEXT,
    "clientCompany" TEXT,
    "projectRef" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settingsSnapshot" TEXT,
    "globalDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "globalContingency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overrideLabourRate" DOUBLE PRECISION,
    "overrideOverheadPct" DOUBLE PRECISION,
    "overrideEngineeringPct" DOUBLE PRECISION,
    "overrideTargetMarginPct" DOUBLE PRECISION,
    "overrideConsumablesPct" DOUBLE PRECISION,
    "overrideGstPct" DOUBLE PRECISION,
    "overrideRoundingIncrement" INTEGER
);

CREATE TABLE IF NOT EXISTS "Board" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Board_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "boardId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labourHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSheetmetal" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Item_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT,
    "category" TEXT,
    "subcategory" TEXT,
    "partNumber" TEXT,
    "description" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "labourHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isAutoAdd" BOOLEAN NOT NULL DEFAULT false,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "meterType" TEXT,
    "isSheetmetal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "labourRate" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "consumablesPct" DOUBLE PRECISION NOT NULL DEFAULT 0.03,
    "overheadPct" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "engineeringPct" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "targetMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    "gstPct" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "roundingIncrement" INTEGER NOT NULL DEFAULT 100,
    "minMarginAlertPct" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "companyName" TEXT,
    "companyAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Indexes (IF NOT EXISTS)
-- Using DO block to safe-guard CREATE INDEX if it exists (for older Postgres compatibility or if specifically named index exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Quote_quoteNumber_key') THEN
        CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
    END IF;
END $$;


-- 3. Safe Columns Additions (For existing tables)
-- Adding isSheetmetal to CatalogItem if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='CatalogItem' AND column_name='isSheetmetal') THEN
        ALTER TABLE "CatalogItem" ADD COLUMN "isSheetmetal" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Adding isSheetmetal to Item if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Item' AND column_name='isSheetmetal') THEN
        ALTER TABLE "Item" ADD COLUMN "isSheetmetal" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Adding other potentially new columns to Quote if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Quote' AND column_name='projectRef') THEN
        ALTER TABLE "Quote" ADD COLUMN "projectRef" TEXT;
    END IF;
END $$;
