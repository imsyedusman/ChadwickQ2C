import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listDeals, fetchOrganization, fetchPerson } from '@/lib/pipedrive';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { type = 'recent', force = false } = body;

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

        console.log(`[Pipedrive Sync] ${force ? 'FORCED ' : ''}START: ${type} sync (Batch: ${batch.id})`);

        let totalDealsProcessed = 0;
        let createdCount = 0;
        let updatedCount = 0;
        let errors = 0;
        let start = 0;
        const limit = 50;
        let hasMore = true;

        // Determine stop condition
        const maxDeals = type === 'recent' ? 200 : 10000; // Cap "All" at 10000 for safety

        let heartbeatRetryCount = 0;

        while (hasMore && totalDealsProcessed < maxDeals) {
            // Updated heartbeat at start of chunk
            try {
                await (prisma as any).importBatch.update({
                    where: { id: batch.id },
                    data: { lastHeartbeatAt: new Date() }
                });
                heartbeatRetryCount = 0; // Reset on success
            } catch (hbError) {
                heartbeatRetryCount++;
                console.error(`[Pipedrive Sync] Heartbeat failure (Count: ${heartbeatRetryCount}):`, hbError);
                if (heartbeatRetryCount >= 3) {
                    await (prisma as any).importBatch.update({
                        where: { id: batch.id },
                        data: { 
                            status: 'FAILED', 
                            completedAt: new Date(),
                            errorLog: { message: 'Heartbeat failure threshold exceeded (3 consecutive misses)' }
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

            for (const deal of deals) {
                try {
                    const dealIdNum = Number(deal.id);
                    const projectName = deal.title;
                    const pipedrive_org_id = deal.org_id?.value || deal.org_id;
                    const pipedrive_person_id = deal.person_id?.value || deal.person_id;

                    console.log(`[Pipedrive Sync] Processing deal ${dealIdNum}: ${projectName}`);

                    // 1. Upsert Client (Organization)
                    let clientId = null;
                    if (pipedrive_org_id) {
                        const orgIdNum = Number(pipedrive_org_id);
                        const orgData = await fetchOrganization(pipedrive_org_id);
                        if (orgData) {
                            const client = await (prisma as any).client.upsert({
                                where: { pipedrive_org_id: orgIdNum },
                                update: { name: orgData.name },
                                create: {
                                    name: orgData.name,
                                    pipedrive_org_id: orgIdNum,
                                    source: 'pipedrive',
                                    import_batch_id: batch.id
                                }
                            });
                            clientId = client.id;
                        }
                    }

                    // 2. Upsert Contact (Person)
                    let contactId = null;
                    if (pipedrive_person_id) {
                        const personIdNum = Number(pipedrive_person_id);
                        const personData = await fetchPerson(pipedrive_person_id);
                        if (personData) {
                            const contact = await (prisma as any).contact.upsert({
                                where: { pipedrive_person_id: personIdNum },
                                update: { 
                                    name: personData.name,
                                    email: personData.email?.[0]?.value || null,
                                    phone: personData.phone?.[0]?.value || null,
                                    clientId: clientId || undefined
                                },
                                create: {
                                    name: personData.name,
                                    email: personData.email?.[0]?.value || null,
                                    phone: personData.phone?.[0]?.value || null,
                                    pipedrive_person_id: personIdNum,
                                    source: 'pipedrive',
                                    clientId: clientId,
                                    import_batch_id: batch.id
                                }
                            });
                            contactId = contact.id;
                        }
                    }

                    // 3. Upsert Project
                    const existingProject = await (prisma as any).project.findUnique({
                        where: { pipedrive_deal_id: dealIdNum }
                    });

                    if (existingProject) {
                        await (prisma as any).project.update({
                            where: { id: existingProject.id },
                            data: {
                                projectName: projectName,
                                clientId: clientId || existingProject.clientId,
                                contactId: contactId || existingProject.contactId,
                                clientName: deal.person_name || existingProject.clientName,
                                companyName: deal.org_name || existingProject.companyName,
                            }
                        });
                        updatedCount++;
                    } else {
                        await (prisma as any).project.create({
                            data: {
                                projectName: projectName,
                                pipedrive_deal_id: dealIdNum,
                                clientId: clientId,
                                contactId: contactId,
                                clientName: deal.person_name,
                                companyName: deal.org_name,
                                projectStatus: 'Budget',
                                source: 'pipedrive',
                                import_batch_id: batch.id
                            }
                        });
                        createdCount++;
                    }
                } catch (innerError: any) {
                    console.error(`[Pipedrive Sync] Error processing deal ${deal.id}:`, innerError.message);
                    errors++;
                }

                totalDealsProcessed++;
            }

            // Update heartbeat and progress at end of chunk
            try {
                await (prisma as any).importBatch.update({
                    where: { id: batch.id },
                    data: { 
                        lastHeartbeatAt: new Date(),
                        totalProjectsAttempted: totalDealsProcessed,
                        totalProjectsCommitted: createdCount + updatedCount
                    }
                });
                heartbeatRetryCount = 0; // Reset on success
            } catch (hbError) {
                heartbeatRetryCount++;
                console.error(`[Pipedrive Sync] Heartbeat failure at end of chunk (Count: ${heartbeatRetryCount}):`, hbError);
                // We'll let the next chunk's start-of-loop heartbeat handle the threshold
            }

            // Pagination Check
            hasMore = response.additional_data?.pagination?.more_items_in_collection && totalDealsProcessed < maxDeals;
            start += limit;
        }

        // Finalize Batch
        const finalBatch = await (prisma as any).importBatch.update({
            where: { id: batch.id },
            data: { 
                status: 'SUCCESS',
                completedAt: new Date(),
                totalProjectsCommitted: createdCount + updatedCount,
                errorLog: errors > 0 ? { errorMessage: `${errors} deals failed to process` } : null
            }
        });

        console.log(`[Pipedrive Sync] Completed. Created: ${createdCount}, Updated: ${updatedCount}, Errors: ${errors}`);

        return NextResponse.json({
            success: true,
            summary: {
                total: totalDealsProcessed,
                created: createdCount,
                updated: updatedCount,
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
