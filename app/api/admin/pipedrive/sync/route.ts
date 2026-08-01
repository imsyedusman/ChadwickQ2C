import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listDeals, fetchOrganization, fetchPerson, getPipedriveToken } from '@/lib/pipedrive';

export async function POST(request: Request) {
    let batchId: string | null = null;
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { mode = 'quick', force = false } = body; // mode: 'quick' or 'full'

        // 1. Pre-check: Pipedrive API Key configuration
        const token = await getPipedriveToken();
        if (!token) {
            console.warn('[Pipedrive Sync] BLOCKED: No API token configured.');
            return NextResponse.json({ 
                error: 'Pipedrive API key is not configured. Please add it in Admin Settings.' 
            }, { status: 400 });
        }

        // Atomic Reset & Create using Transaction
        const batch = await (prisma as any).$transaction(async (tx: any) => {
            // 1. If force: true, mark all running as failed first
            if (force) {
                console.log(`[Pipedrive Sync] FORCE RESET: Marking all existing RUNNING batches as FAILED.`);
                await tx.importBatch.updateMany({
                    where: { status: 'RUNNING', source: 'pipedrive' },
                    data: { 
                        status: 'FAILED', 
                        completedAt: new Date(),
                        errorLog: { message: 'Overridden by Force Reset' }
                    }
                });
            }

            // 2. Concurrency Check
            const activeBatch = await tx.importBatch.findFirst({
                where: { status: 'RUNNING', source: 'pipedrive' }
            });

            if (activeBatch) {
                // Heartbeat check: if last heartbeat was more than 15 minutes ago, auto-fail it
                const staleThreshold = new Date(Date.now() - 15 * 60 * 1000);
                if (activeBatch.lastHeartbeatAt < staleThreshold) {
                    console.log(`[Pipedrive Sync] AUTO RECOVERY: Marking stale batch ${activeBatch.id} as FAILED.`);
                    await tx.importBatch.update({
                        where: { id: activeBatch.id },
                        data: { 
                            status: 'FAILED', 
                            completedAt: new Date(),
                            errorLog: { message: 'Automated Stale Detection (15m inactivity)' }
                        }
                    });
                } else {
                    const minutesSince = Math.round((Date.now() - activeBatch.lastHeartbeatAt.getTime()) / 60000);
                    console.log(`[Pipedrive Sync] BLOCKED: Active batch ${activeBatch.id} detected (Last heartbeat: ${minutesSince}m ago).`);
                    throw new Error(`CONFLICT|${activeBatch.id}|${activeBatch.startedAt.toISOString()}|${activeBatch.lastHeartbeatAt.toISOString()}|${minutesSince}`);
                }
            }

            // 3. Create new tracking batch
            return await tx.importBatch.create({
                data: {
                    source: 'pipedrive',
                    status: 'RUNNING',
                    startedAt: new Date(),
                    lastHeartbeatAt: new Date()
                }
            });
        });

        batchId = (batch as any).id;
        console.log(`[Pipedrive Sync] ${force ? 'FORCED ' : ''}START: ${mode} sync (Batch: ${batchId})`);

        let totalDealsProcessed = 0;
        let createdCount = 0;
        let updatedCount = 0;
        let errors = 0;
        let start = 0;
        const limit = 50;
        let hasMore = true;

        // Determine stop condition
        const maxDeals = mode === 'quick' ? 50 : 10000; // Strictly 50 for quick, 10000 for full safety

        let heartbeatRetryCount = 0;

        // Helper to extract Pipedrive ID safely
        const extractId = (val: any) => {
            if (!val) return null;
            if (typeof val === 'object') return val.value || null;
            if (typeof val === 'number') return val;
            if (typeof val === 'string' && /^\d+$/.test(val)) return parseInt(val);
            return null;
        };

        // Helper to extract Custom Field value safely
        const safeExtract = (val: any) => {
            if (val === null || val === undefined) return null;
            if (typeof val === 'string') return val.trim();
            if (typeof val === 'object' && val.name) return String(val.name).trim();
            if (typeof val === 'object' && val.value) return String(val.value).trim();
            if (typeof val === 'object' && val.label) return String(val.label).trim();
            return String(val).trim();
        };

        while (hasMore && totalDealsProcessed < maxDeals) {
            // Heartbeat at start of chunk
            try {
                await (prisma as any).importBatch.update({
                    where: { id: batchId },
                    data: { lastHeartbeatAt: new Date() }
                });
                heartbeatRetryCount = 0;
            } catch (hbError) {
                heartbeatRetryCount++;
                if (heartbeatRetryCount >= 3) {
                    await (prisma as any).importBatch.update({
                        where: { id: batchId },
                        data: { 
                            status: 'FAILED', 
                            completedAt: new Date(),
                            errorLog: { message: 'Heartbeat failure threshold exceeded' }
                        }
                    });
                    throw new Error('Sync terminated due to persistent heartbeat failures');
                }
            }

            const response = await listDeals({ start, limit, sort: 'add_time DESC' });
            if (!response || !response.data) {
                console.error(`[Pipedrive Sync] Failed to fetch deals at start=${start}`);
                break;
            }

            const deals = response.data;
            if (deals.length === 0) break;

            console.log(`[Pipedrive Sync] Processing batch of ${deals.length} deals...`);

            for (const deal of deals) {
                try {
                    const dealIdNum = Number(deal.id);
                    const projectName = deal.title;
                    const pipedrive_org_id = extractId(deal.org_id);
                    const pipedrive_person_id = extractId(deal.person_id);

                    // 1. Upsert Client (Organization)
                    let clientId = null;
                    let orgData = null;
                    if (pipedrive_org_id) {
                        orgData = await fetchOrganization(pipedrive_org_id);
                        if (orgData) {
                            const client = await (prisma as any).client.upsert({
                                where: { pipedrive_org_id: Number(pipedrive_org_id) },
                                update: { name: orgData.name },
                                create: {
                                    name: orgData.name,
                                    pipedrive_org_id: Number(pipedrive_org_id),
                                    source: 'pipedrive',
                                    importBatch: { connect: { id: batch.id } }
                                }
                            });
                            clientId = client.id;
                        }
                    }

                    // 2. Upsert Contact (Person)
                    let contactId = null;
                    let personData = null;
                    if (pipedrive_person_id) {
                        personData = await fetchPerson(pipedrive_person_id);
                        if (personData) {
                            const contact = await (prisma as any).contact.upsert({
                                where: { pipedrive_person_id: Number(pipedrive_person_id) },
                                update: { 
                                    name: personData.name.trim(),
                                    email: (personData.email?.[0]?.value || "").trim() || null,
                                    phone: (personData.phone?.[0]?.value || "").trim() || null,
                                    client: clientId ? { connect: { id: clientId } } : undefined
                                },
                                create: {
                                    name: personData.name.trim(),
                                    email: (personData.email?.[0]?.value || "").trim() || null,
                                    phone: (personData.phone?.[0]?.value || "").trim() || null,
                                    pipedrive_person_id: Number(pipedrive_person_id),
                                    source: 'pipedrive',
                                    client: clientId ? { connect: { id: clientId } } : undefined,
                                    importBatch: { connect: { id: batch.id } }
                                }
                            });
                            contactId = contact.id;
                        } else {
                            console.warn(`[Pipedrive Sync] Secondary fetch failed for person ${pipedrive_person_id}. Setting contactId to null.`);
                        }
                    }

                    // 3. Upsert Project - STRICT PRODUCTION SAFEGUARDS
                    const dealValue = typeof deal.value === 'number' 
                        ? deal.value 
                        : (deal.value ? parseFloat(String(deal.value)) : null);
                    
                    const currency = deal.currency || null;
                    const quoteFolder = safeExtract(deal['47359133abef167a5b3ec1276f449c3743ce970f']);
                    const pipedriveDealUrl = `https://app.pipedrive.com/deal/${deal.id}`;
                    
                    // Standardized Owner Extraction
                    const pipedriveOwnerId = deal.user_id?.id || (typeof deal.user_id === 'number' ? deal.user_id : null);
                    const pipedriveOwnerName = deal.user_id?.name || deal.owner_name || null;

                    const parseDate = (dateStr: any) => {
                        if (!dateStr) return null;
                        try {
                            const date = new Date(dateStr);
                            return isNaN(date.getTime()) ? null : date;
                        } catch { return null; }
                    };
                    const dealCreatedAt = parseDate(deal.add_time);
                    const expectedCloseDate = parseDate(deal.expected_close_date);

                    const existingProject = await (prisma as any).project.findUnique({
                        where: { pipedrive_deal_id: dealIdNum }
                    });

                    if (existingProject) {
                        const updateData: any = {};
                        let changed = false;

                        // 3.1 Stable Field Protection (Update ONLY if null/undefined)
                        if ((existingProject.projectName === null || existingProject.projectName === undefined) && projectName) {
                            updateData.projectName = projectName;
                            changed = true;
                        }

                        if ((existingProject.clientId === null || existingProject.clientId === undefined) && clientId) {
                            updateData.client = { connect: { id: clientId } };
                            changed = true;
                        }

                        if ((existingProject.contactId === null || existingProject.contactId === undefined) && contactId) {
                            updateData.contact = { connect: { id: contactId } };
                            changed = true;
                        }

                        if ((existingProject.clientName === null || existingProject.clientName === undefined) && (personData?.name || deal.person_name)) {
                            updateData.clientName = personData?.name || deal.person_name || null;
                            changed = true;
                        }

                        if ((existingProject.companyName === null || existingProject.companyName === undefined) && (orgData?.name || deal.org_name)) {
                            updateData.companyName = orgData?.name || deal.org_name || null;
                            changed = true;
                        }

                        // 3.2 Metadata Fields rule (Hard Guard: Prevent Empty Overwrites + Compare Before Update)
                        const metadataFields: Record<string, any> = {
                            dealValue,
                            currency,
                            dealCreatedAt,
                            expectedCloseDate,
                            quoteFolder,
                            pipedriveDealUrl,
                            pipedriveDealStatus: deal.status || null,
                            // Sync Safety: Only include owner if non-null
                            ...(pipedriveOwnerId ? { pipedriveOwnerId } : {}),
                            ...(pipedriveOwnerName ? { pipedriveOwnerName } : {})
                        };

                        for (const [key, incomingVal] of Object.entries(metadataFields)) {
                            // Hard Guard: Prevent Empty Overwrites
                            if (incomingVal === null || incomingVal === undefined || incomingVal === '') continue;

                            const existingVal = existingProject[key];
                            let isChanged = false;

                            if (incomingVal instanceof Date && existingVal instanceof Date) {
                                isChanged = incomingVal.getTime() !== existingVal.getTime();
                            } else {
                                isChanged = existingVal !== incomingVal;
                            }

                            if (isChanged) {
                                // Audit Logging for Owner Change
                                if (key === 'pipedriveOwnerId' && existingProject.pipedriveOwnerId !== incomingVal) {
                                    console.log(`[Pipedrive Sync] Owner Changed for Project ${existingProject.id}: ${existingProject.pipedriveOwnerName || 'None'} -> ${pipedriveOwnerName}`);
                                }

                                updateData[key] = incomingVal;
                                changed = true;
                            }
                        }

                        if (changed) {
                            await (prisma as any).project.update({
                                where: { id: existingProject.id },
                                data: {
                                    ...updateData,
                                    importBatch: { connect: { id: batch.id } },
                                    source: 'pipedrive'
                                }
                            });
                            updatedCount++;
                            console.log(`[Pipedrive Sync] Project UPDATED: ${projectName} (${dealIdNum})`);
                        } else {
                            console.log(`[Pipedrive Sync] Project SKIPPED (No changes): ${projectName} (${dealIdNum})`);
                        }
                    } else {
                        // Create New Project
                        await (prisma as any).project.create({
                            data: {
                                projectName,
                                client: clientId ? { connect: { id: clientId } } : undefined,
                                contact: contactId ? { connect: { id: contactId } } : undefined,
                                clientName: personData?.name || deal.person_name || null,
                                companyName: orgData?.name || deal.org_name || null,
                                pipedrive_deal_id: dealIdNum,
                                dealValue,
                                currency,
                                dealCreatedAt,
                                expectedCloseDate,
                                quoteFolder,
                                pipedriveDealUrl,
                                pipedriveOwnerId,
                                pipedriveOwnerName,
                                projectStatus: 'Tender',
                                source: 'pipedrive',
                                importBatch: { connect: { id: batch.id } }
                            }
                        });
                        createdCount++;
                        console.log(`[Pipedrive Sync] Project CREATED: ${projectName} (${dealIdNum})`);
                    }
                } catch (innerError: any) {
                    console.error(`[Pipedrive Sync] Error processing deal ${deal.id}:`, innerError.message);
                    errors++;
                }
                totalDealsProcessed++;
            }

            // Update stats at end of chunk
            await (prisma as any).importBatch.update({
                where: { id: batchId },
                data: { 
                    totalProjectsAttempted: totalDealsProcessed,
                    totalProjectsCommitted: updatedCount,
                    lastHeartbeatAt: new Date()
                }
            });

            // Pagination Check
            hasMore = mode === 'full' && 
                      response.additional_data?.pagination?.more_items_in_collection && 
                      totalDealsProcessed < maxDeals;
            start += limit;
        }

        // Finalize Batch
        await (prisma as any).importBatch.update({
            where: { id: batchId },
            data: { 
                status: 'SUCCESS',
                completedAt: new Date(),
                errorLog: errors > 0 ? { errorMessage: `${errors} deals failed to process` } : null
            }
        });

        console.log(`[Pipedrive Sync] Completed ${mode} sync. Total: ${totalDealsProcessed}, Errors: ${errors}`);

        return NextResponse.json({
            success: true,
            summary: {
                total: totalDealsProcessed,
                created: createdCount,
                updated: updatedCount,
                errors
            },
            batchId: batchId
        });
    } catch (error: any) {
        if (error.message.startsWith('CONFLICT|')) {
            const parts = error.message.split('|');
            const [, id, startedAt, lastHeartbeatAt, minutesSince] = parts;
            return NextResponse.json({ 
                error: 'A synchronization is already in progress.', 
                conflict: {
                    id,
                    startedAt,
                    lastHeartbeatAt,
                    minutesSince: parseInt(minutesSince || '0')
                }
            }, { status: 409 });
        }

        console.error('[Pipedrive Sync] Global Error:', error);
        
        // Finalize Batch as FAILED if possible
        const targetId = batchId;
        if (targetId) {
            try {
                await (prisma as any).importBatch.update({
                    where: { id: targetId },
                    data: { 
                        status: 'FAILED',
                        completedAt: new Date(),
                        errorLog: { errorMessage: error.message }
                    }
                });
            } catch (updateError) {
                console.error('[Pipedrive Sync] Failed to mark batch as FAILED:', updateError);
            }
        }

        return NextResponse.json({ 
            error: 'Failed to synchronize with Pipedrive', 
            details: error.message 
        }, { status: 500 });
    }
}
