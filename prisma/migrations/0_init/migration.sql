-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
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
    "overrideRoundingIncrement" INTEGER,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "config" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;

