import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listDeals, fetchOrganization, fetchPerson, getPipedriveToken } from '@/lib/pipedrive';

export async function POST(request: Request) {
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
                    throw new Error(`CONFLICT: ${activeBatch.id}|${activeBatch.startedAt.toISOString()}|${activeBatch.lastHeartbeatAt.toISOString()}|${minutesSince}`);
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

        console.log(`[Pipedrive Sync] ${force ? 'FORCED ' : ''}START: ${mode} sync (Batch: ${batch.id})`);

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

        while (hasMore && totalDealsProcessed < maxDeals) {
            // Heartbeat at start of chunk
            try {
                await (prisma as any).importBatch.update({
                    where: { id: batch.id },
                    data: { lastHeartbeatAt: new Date() }
                });
                heartbeatRetryCount = 0;
            } catch (hbError) {
                heartbeatRetryCount++;
                if (heartbeatRetryCount >= 3) {
                    await (prisma as any).importBatch.update({
                        where: { id: batch.id },
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
                                    import_batch_id: batch.id
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
                                    clientId: clientId || undefined
                                },
                                create: {
                                    name: personData.name.trim(),
                                    email: (personData.email?.[0]?.value || "").trim() || null,
                                    phone: (personData.phone?.[0]?.value || "").trim() || null,
                                    pipedrive_person_id: Number(pipedrive_person_id),
                                    source: 'pipedrive',
                                    clientId: clientId,
                                    import_batch_id: batch.id
                                }
                            });
                            contactId = contact.id;
                        } else {
                            console.warn(`[Pipedrive Sync] Secondary fetch failed for person ${pipedrive_person_id}. Setting contactId to null.`);
                        }
                    }

                    // 3. Upsert Project
                    const data = {
                        projectName: projectName,
                        clientId: clientId || null,
                        contactId: contactId || null,
                        clientName: personData?.name || deal.person_name || null,
                        companyName: orgData?.name || deal.org_name || null,
                        import_batch_id: batch.id
                    };

                    await (prisma as any).project.upsert({
                        where: { pipedrive_deal_id: dealIdNum },
                        update: data,
                        create: {
                            ...data,
                            pipedrive_deal_id: dealIdNum,
                            projectStatus: 'Budget',
                            source: 'pipedrive',
                        }
                    });
                    
                    // Simple tracking (upsert doesn't tell us if it was create or update easily without return)
                    // But we can just count total successes
                    updatedCount++; 
                } catch (innerError: any) {
                    console.error(`[Pipedrive Sync] Error processing deal ${deal.id}:`, innerError.message);
                    errors++;
                }
                totalDealsProcessed++;
            }

            // Update stats at end of chunk
            await (prisma as any).importBatch.update({
                where: { id: batch.id },
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
            where: { id: batch.id },
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
                errors
            },
            batchId: batch.id
        });
    } catch (error: any) {
        if (error.message.startsWith('CONFLICT:')) {
            const [, id, startedAt, lastHeartbeatAt, minutesSince] = error.message.split('|');
            return NextResponse.json({ 
                error: 'A synchronization is already in progress.', 
                conflict: {
                    id,
                    startedAt,
                    lastHeartbeatAt,
                    minutesSince: parseInt(minutesSince)
                }
            }, { status: 409 });
        }

        console.error('[Pipedrive Sync] Global Error:', error);
        return NextResponse.json({ 
            error: 'Failed to synchronize with Pipedrive', 
            details: error.message 
        }, { status: 500 });
    }
}
