import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const quote = await prisma.quote.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { boards: { include: { items: true } } }
        });

        if (!quote) return console.log("No quote");

        console.log("Original Overrides:");
        console.log("Labour:", quote.overrideLabourRate);
        console.log("Margin:", quote.overrideTargetMarginPct);
        console.log("SettingsSnapshot:", quote.settingsSnapshot);

        const newRevision = quote.revision + 1;

        const newQuote = await prisma.quote.create({
            data: {
                quoteNumber: quote.quoteNumber,
                revision: newRevision,
                clientName: quote.clientName,
                projectRef: `${quote.projectRef} (Copy)`,
                description: quote.description,
                status: 'DRAFT',
                settingsSnapshot: quote.settingsSnapshot,
                globalDiscount: quote.globalDiscount,
                globalContingency: quote.globalContingency,
                overrideLabourRate: quote.overrideLabourRate,
                overrideOverheadPct: quote.overrideOverheadPct,
                overrideEngineeringPct: quote.overrideEngineeringPct,
                overrideTargetMarginPct: quote.overrideTargetMarginPct,
                overrideConsumablesPct: quote.overrideConsumablesPct,
                overrideGstPct: quote.overrideGstPct,
                overrideRoundingIncrement: quote.overrideRoundingIncrement,
                overrideCopperPricePerKg: quote.overrideCopperPricePerKg,
                boards: {
                    create: quote.boards.map((b: any) => ({
                        name: b.name, type: b.type, order: b.order, isOptional: b.isOptional,
                        mccbVariant: b.mccbVariant, config: b.config,
                        items: {
                            create: b.items.map((i: any) => ({
                                category: i.category, subcategory: i.subcategory, name: i.name,
                                description: i.description, quantity: i.quantity, unitPrice: i.unitPrice,
                                labourHours: i.labourHours, cost: i.cost, notes: i.notes, isDefault: i.isDefault,
                                order: i.order, isSheetmetal: i.isSheetmetal, isSystemManaged: i.isSystemManaged,
                                systemTag: i.systemTag, partNumber: i.partNumber, productFrame: i.productFrame,
                                mccbVariant: i.mccbVariant, systemRuleType: i.systemRuleType
                            }))
                        }
                    }))
                }
            },
            include: { boards: { include: { items: true } } }
        });

        console.log("Duplicate Overrides:");
        console.log("Labour:", newQuote.overrideLabourRate);
        console.log("Margin:", newQuote.overrideTargetMarginPct);
        console.log("SettingsSnapshot:", newQuote.settingsSnapshot);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();
