import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Board, Item } from '@prisma/client';
import { generateRevisionNumber } from '@/lib/quote-numbering';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/audit';
import { getOrCreateDefaultAdminUser } from '@/lib/user-utils';
import { prepareBoardCloneData } from '@/lib/board-service';
import { calculateQuoteTotals } from '@/lib/pricing';
import { getGlobalSettings, getEffectiveSettingsForQuote } from '@/lib/settings-service';
import { getResolvedUserId } from '@/lib/user-utils';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Fetch the original quote with all boards and items
        const originalQuote = await prisma.quote.findUnique({
            where: { id },
            include: {
                boards: {
                    include: {
                        items: true,
                    }
                }
            }
        });

        if (!originalQuote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        const newQuote = await prisma.$transaction(async (tx) => {
            const groupId = originalQuote.revisionGroupId || originalQuote.id;
            
            // Ensure the original quote is marked as part of its own group if it wasn't already
            if (!originalQuote.revisionGroupId) {
                await tx.quote.update({
                    where: { id: originalQuote.id },
                    data: { revisionGroupId: originalQuote.id }
                });
            }

            // REVISION RULE: Alphabetical suffix (e.g., -A, -B)
            // generateRevisionNumber extracts base and finds next suffix within the group
            const newFullQuoteNumber = await generateRevisionNumber(originalQuote.quoteNumber, groupId);

            const session = await getServerSession(authOptions);
            let userId = (session?.user as any)?.id;
            const userEmail = (session?.user as any)?.email;

            // Robust User Resolution
            let dbUser = null;
            if (userId) {
                dbUser = await (tx as any).user.findUnique({ where: { id: userId } });
            }
            if (!dbUser && userEmail) {
                dbUser = await (tx as any).user.findUnique({ where: { email: userEmail } });
                if (dbUser) userId = dbUser.id;
            }
            if (!dbUser) {
                dbUser = await getOrCreateDefaultAdminUser();
                if (dbUser) userId = dbUser.id;
            }

            if (!dbUser || !userId) {
                throw new Error('Quote revision failed: No valid users found in database.');
            }

            // Create the new quote with all boards and items
            return await (tx.quote as any).create({
                data: {
                    quoteNumber: newFullQuoteNumber,
                    revision: 0, // Suffix is handled in the quoteNumber string itself
                    revisionGroupId: groupId,
                    clientName: originalQuote.clientName,
                    clientCompany: originalQuote.clientCompany,
                    projectId: originalQuote.projectId, 
                    projectRef: originalQuote.projectRef,
                    description: originalQuote.description,
                    status: 'DRAFT',
                    settingsSnapshot: originalQuote.settingsSnapshot,
                    globalDiscount: originalQuote.globalDiscount,
                    globalContingency: originalQuote.globalContingency,
                    gridInternalNotes: originalQuote.gridInternalNotes,
                    
                    // Copy exact Financial Overrides
                    overrideLabourRate: originalQuote.overrideLabourRate,
                    overrideOverheadPct: originalQuote.overrideOverheadPct,
                    overrideEngineeringPct: originalQuote.overrideEngineeringPct,
                    overrideTargetMarginPct: originalQuote.overrideTargetMarginPct,
                    overrideConsumablesPct: originalQuote.overrideConsumablesPct,
                    overrideGstPct: originalQuote.overrideGstPct,
                    overrideRoundingIncrement: originalQuote.overrideRoundingIncrement,
                    overrideCopperPricePerKg: originalQuote.overrideCopperPricePerKg,
                    
                    // Ownership
                    createdBy: userId as string,
                    lastModifiedBy: userId as string,

                    boards: {
                        create: originalQuote.boards.map((board: Board & { items: Item[] }) => {
                            const clonedBoardData = prepareBoardCloneData(board);
                            return {
                                ...clonedBoardData,
                                items: {
                                    create: board.items.map((item: Item) => ({
                                        category: item.category,
                                        subcategory: item.subcategory,
                                        name: item.name,
                                        description: item.description,
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                        labourHours: item.labourHours,
                                        cost: item.cost,
                                        notes: item.notes,
                                        isDefault: item.isDefault,
                                        order: item.order,
                                        isSheetmetal: item.isSheetmetal,
                                        isSystemManaged: item.isSystemManaged,
                                        systemTag: item.systemTag,
                                        partNumber: item.partNumber,
                                        productFrame: item.productFrame,
                                        mccbVariant: item.mccbVariant,
                                        systemRuleType: item.systemRuleType
                                    }))
                                }
                            };
                        })
                    }
                },
                include: {
                    boards: {
                        include: { items: true }
                    }
                }
            });
        });

        // 2. FETCH SETTINGS FOR CALCULATION (Safe Defaults)
        const effectiveSettings = await getEffectiveSettingsForQuote(newQuote);
        
        // 3. ATOMIC RECALCULATION & UPDATE
        const { grandTotals } = calculateQuoteTotals(newQuote.boards as any, effectiveSettings);

        // Resolve valid user ID for lastModifiedBy (prevents P2003)
        const session = await getServerSession(authOptions);
        const resolvedUserId = await getResolvedUserId(session);

        // Update with calculated totals (Note: only persist fields that exist in Quote model)
        const finalizedQuote = await (prisma.quote as any).update({
            where: { id: newQuote.id },
            data: {
                lastModifiedBy: resolvedUserId,
                // totals are NOT persisted in Quote table, only calculation results returned to UI
            },
            include: {
                modifier: { select: { name: true } },
                creator: { select: { name: true } }
            }
        });

        await logAction(resolvedUserId, 'REVISE_QUOTE', 'QUOTE', finalizedQuote.id, { 
            originalId: id, 
            newQuoteNumber: finalizedQuote.quoteNumber 
        });

        // Add calculated totals to the JSON response (Frontend expects them)
        return NextResponse.json({
            ...finalizedQuote,
            totalExGST: grandTotals.sellPriceRounded,
            totalIncGST: grandTotals.finalSellPrice,
            gstAmount: grandTotals.gst,
            // Legacy support
            total: grandTotals.sellPriceRounded,
            totalIncGst: grandTotals.finalSellPrice
        });
    } catch (error: any) {
        console.error('Failed to create revision:', error);
        return NextResponse.json({ 
            error: 'Failed to create revision', 
            details: error.message,
            success: false 
        }, { status: 500 });
    }
}
