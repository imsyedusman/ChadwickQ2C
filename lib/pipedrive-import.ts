import prisma from './prisma';
import { Prisma } from '@prisma/client';

/**
 * Single source of truth for ID normalization.
 * Stringifies, trims, and removes all internal whitespace/hidden characters.
 */
export function normalizeId(val: any): string {
    return String(val || "").trim().replace(/\s+/g, "");
}

export function normalizeValue(val: any): string | null {
    if (val === undefined || val === null) return null;
    const str = String(val).trim();
    if (!str || str === '' || str.toLowerCase() === 'null' || str.toLowerCase() === 'n/a') return null;
    return str;
}

export function extractFirstValue(val: any): string | null {
    const normalized = normalizeValue(val);
    if (!normalized) return null;
    const parts = normalized.split(/[,;]/).map(p => p.trim()).filter(Boolean);
    return parts.length > 0 ? parts[0] : null;
}

export interface PipedriveOrg {
    pipedrive_org_id: string;
    name: string;
}

export interface PipedrivePerson {
    pipedrive_person_id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    org_id?: string | null;
}

export interface PipedriveDeal {
    pipedrive_deal_id: string;
    name: string;
    org_id: string;
    person_id?: string | null;
    value?: string | number | null;
    currency?: string | null;
    add_time?: string | null;
    expected_close_date?: string | null;
    quote_folder?: string | null;
    pipedriveOwnerName?: string | null;
    pipedriveOwnerId?: string | number | null;
}

export interface ImportOptions {
    mode: 'UPDATE' | 'REPLACE';
    source?: string;
    debug?: boolean;
}

export interface ImportMetrics {
    clients: { total: number; committed: number; skipped: number; duplicates: number };
    contacts: { total: number; committed: number; skipped: number; unmatched: number };
    projects: { total: number; committed: number; skipped: number; linked: number; unlinked: number };
}

export interface StructuredErrorLog {
    skippedDeals: { id: string; name: string; org_id: string; reason: string; inMap?: boolean }[];
    unmatchedContacts: { id: string; name: string; org_id: string | null }[];
    duplicateOrgs: { id: string; normalized: string; count: number }[];
    missingContacts: { deal_id: string; person_id: string }[];
    validationErrors: string[];
    debugInfo?: any;
    truncated?: boolean;
}

const MAX_ERROR_ENTRIES = 100;
const HEARTBEAT_INTERVAL_MS = 10000;
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

export async function syncPipedriveData(
    orgsRaw: PipedriveOrg[],
    peopleRaw: PipedrivePerson[],
    dealsRaw: PipedriveDeal[],
    options: ImportOptions = { mode: 'UPDATE' }
) {
    const source = options.source || 'pipedrive';
    const errorLog: StructuredErrorLog = {
        skippedDeals: [],
        unmatchedContacts: [],
        duplicateOrgs: [],
        missingContacts: [],
        validationErrors: []
    };

    const addError = (category: keyof StructuredErrorLog, entry: any) => {
        const target = errorLog[category] as any[];
        if (target.length < MAX_ERROR_ENTRIES) target.push(entry);
        else errorLog.truncated = true;
    };

    // 1. Initial ID Normalization & Deduplication
    const normalizedOrgsMap = new Map<string, PipedriveOrg>();
    const orgCollisionCounts = new Map<string, number>();

    orgsRaw.forEach(org => {
        const id = normalizeId(org.pipedrive_org_id);
        if (!id) return;
        if (normalizedOrgsMap.has(id)) {
            orgCollisionCounts.set(id, (orgCollisionCounts.get(id) || 1) + 1);
        }
        normalizedOrgsMap.set(id, org);
    });

    orgCollisionCounts.forEach((count, id) => {
        addError('duplicateOrgs', { id, normalized: id, count });
    });

    const orgs = Array.from(normalizedOrgsMap.values());
    const people = Array.from(new Map(peopleRaw.map(p => [normalizeId(p.pipedrive_person_id), p])).values());
    const deals = Array.from(new Map(dealsRaw.map(d => [normalizeId(d.pipedrive_deal_id), d])).values());

    if (orgs.length === 0) {
        throw new Error('No valid organizations processed. Mapping layer requires at least one organization.');
    }

    // 2. Concurrency Lock
    const existingBatch = await prisma.importBatch.findFirst({
        where: { source, status: 'PENDING', lastHeartbeatAt: { gt: new Date(Date.now() - LOCK_TIMEOUT_MS) } }
    });
    if (existingBatch) throw new Error(`An import is already in progress.`);

    const batch = await prisma.importBatch.create({
        data: { source, status: 'PENDING', startedAt: new Date(), lastHeartbeatAt: new Date() }
    });

    const metrics: ImportMetrics = {
        clients: { total: orgsRaw.length, committed: 0, skipped: orgsRaw.length - orgs.length, duplicates: orgCollisionCounts.size },
        contacts: { total: peopleRaw.length, committed: 0, skipped: peopleRaw.length - people.length, unmatched: 0 },
        projects: { total: dealsRaw.length, committed: 0, skipped: 0, linked: 0, unlinked: 0 }
    };

    let heartbeatTimer: NodeJS.Timeout | null = null;
    const updateHeartbeat = async () => {
        try { await prisma.importBatch.update({ where: { id: batch.id }, data: { lastHeartbeatAt: new Date() } }); }
        catch (e) { console.error('Heartbeat failure', e); }
    };

    const orgMap: Record<string, string> = {}; // Transaction-scope Client Map

    try {
        heartbeatTimer = setInterval(updateHeartbeat, HEARTBEAT_INTERVAL_MS);

        await prisma.$transaction(async (tx) => {
            if (options.mode === 'REPLACE') {
                const linkedCount = await tx.quote.count({ where: { project: { source } } });
                if (linkedCount > 0) throw new Error(`Replace blocked: ${linkedCount} quotes exist.`);
                await tx.project.deleteMany({ where: { source } });
                await tx.contact.deleteMany({ where: { source } });
                await tx.client.deleteMany({ where: { source } });
            }

            // --- STEP 1: CLIENTS ---
            for (const org of orgs) {
                const id = normalizeId(org.pipedrive_org_id);
                if (!id || !org.name) continue;
                const client = await tx.client.upsert({
                    where: { pipedrive_org_id: parseInt(id) },
                    update: { name: org.name, importBatch: { connect: { id: batch.id } }, source },
                    create: { name: org.name, pipedrive_org_id: parseInt(id), importBatch: { connect: { id: batch.id } }, source }
                });
                orgMap[id] = client.id;
                metrics.clients.committed++;
            }

            if (Object.keys(orgMap).length === 0) throw new Error('Client map is empty. Mapping failure expected.');
            if (options.debug) errorLog.debugInfo = { orgMapSize: Object.keys(orgMap).length, sampleKeys: Object.keys(orgMap).slice(0, 10) };

            // --- STEP 2: CONTACTS ---
            const personMap = new Map<string, string>();
            for (const person of people) {
                const pId = normalizeId(person.pipedrive_person_id);
                if (!pId || !person.name) continue;

                const orgKey = normalizeId(person.org_id);
                const clientId = orgKey ? orgMap[orgKey] : null;

                if (orgKey && !clientId) {
                    metrics.contacts.unmatched++;
                    addError('unmatchedContacts', { id: pId, name: person.name, org_id: orgKey });
                }

                const contact = await tx.contact.upsert({
                    where: { pipedrive_person_id: parseInt(pId) },
                    update: { 
                        name: person.name, 
                        email: normalizeValue(person.email)?.toLowerCase(), 
                        phone: extractFirstValue(person.phone), 
                        client: clientId ? { connect: { id: clientId } } : undefined, 
                        importBatch: { connect: { id: batch.id } }, 
                        source 
                    },
                    create: { 
                        name: person.name, 
                        email: normalizeValue(person.email)?.toLowerCase(), 
                        phone: extractFirstValue(person.phone), 
                        pipedrive_person_id: parseInt(pId), 
                        client: clientId ? { connect: { id: clientId } } : undefined, 
                        importBatch: { connect: { id: batch.id } }, 
                        source 
                    }
                });
                personMap.set(pId, contact.id);
                metrics.contacts.committed++;
            }

            // --- STEP 3: PROJECTS (DEALS) ---
            for (const deal of deals) {
                const dId = normalizeId(deal.pipedrive_deal_id);
                if (!dId || !deal.name) continue;

                const orgKey = normalizeId(deal.org_id);
                const clientId = orgMap[orgKey];

                if (!clientId) {
                    metrics.projects.skipped++;
                    addError('skippedDeals', { id: dId, name: deal.name, org_id: orgKey, reason: 'Client not found in orgMap', inMap: false });
                    continue;
                }

                const contactId = deal.person_id ? personMap.get(normalizeId(deal.person_id)) : null;
                if (deal.person_id && !contactId) {
                    addError('missingContacts', { deal_id: dId, person_id: normalizeId(deal.person_id) });
                }

                const dIdNum = parseInt(dId);
                const projectTx = tx.project as any;
                const existingProject = await projectTx.findUnique({
                    where: { pipedrive_deal_id: dIdNum }
                });

                // 3.1 Strict Field Mapping & Safeguards
                const dealValue = typeof deal.value === 'number' 
                    ? deal.value 
                    : (deal.value ? parseFloat(String(deal.value)) : null);
                
                const parseDate = (d: any) => {
                    if (!d) return null;
                    try {
                        const date = new Date(d);
                        return isNaN(date.getTime()) ? null : date;
                    } catch { return null; }
                };
                const dealCreatedAt = parseDate(deal.add_time);
                const expectedCloseDate = parseDate(deal.expected_close_date);
                const quoteFolder = typeof deal.quote_folder === 'string' ? deal.quote_folder.trim() : null;
                const pipedriveDealUrl = `https://app.pipedrive.com/deal/${dIdNum}`;

                // Extract Owner Info (if provided in CSV mapping)
                const pipedriveOwnerId = deal.pipedriveOwnerId ? parseInt(String(deal.pipedriveOwnerId)) : null;
                const pipedriveOwnerName = deal.pipedriveOwnerName || null;

                if (existingProject) {
                    const updateData: any = {};
                    let changed = false;
                    const ep = existingProject as any;

                    // 3.2 Stable Field Protection (Update ONLY if null/undefined)
                    if ((ep.projectName === null || ep.projectName === undefined) && deal.name) {
                        updateData.projectName = deal.name;
                        changed = true;
                    }

                    if ((ep.clientId === null || ep.clientId === undefined) && clientId) {
                        updateData.client = { connect: { id: clientId } };
                        changed = true;
                    }

                    if ((ep.contactId === null || ep.contactId === undefined) && contactId) {
                        updateData.contact = { connect: { id: contactId } };
                        changed = true;
                    }

                    // 3.3 Metadata Fields rule (Hard Guard: Prevent Empty Overwrites + Compare Before Update)
                    const metadataFields: any = {
                        dealValue,
                        currency: deal.currency || null,
                        dealCreatedAt,
                        expectedCloseDate,
                        quoteFolder,
                        pipedriveDealUrl,
                        // Sync Safety: Only update owner if non-null
                        ...(pipedriveOwnerId ? { pipedriveOwnerId } : {}),
                        ...(pipedriveOwnerName ? { pipedriveOwnerName } : {})
                    };

                    for (const [key, incomingVal] of Object.entries(metadataFields)) {
                        // Hard Guard: Prevent Empty Overwrites
                        if (incomingVal === null || incomingVal === undefined || incomingVal === '') continue;

                        const existingVal = ep[key];
                        let isChanged = false;

                        if (incomingVal instanceof Date && existingVal instanceof Date) {
                            isChanged = incomingVal.getTime() !== existingVal.getTime();
                        } else {
                            isChanged = existingVal !== incomingVal;
                        }

                        if (isChanged) {
                            // Audit Logging for Owner Change
                            if (key === 'pipedriveOwnerId' && ep.pipedriveOwnerId !== incomingVal) {
                                console.log(`[Pipedrive Import] Owner Changed for Project ${ep.id}: ${ep.pipedriveOwnerName || 'None'} -> ${pipedriveOwnerName}`);
                            }

                            updateData[key] = incomingVal;
                            changed = true;
                        }
                    }

                    if (changed) {
                        await projectTx.update({
                            where: { id: existingProject.id },
                            data: {
                                ...updateData,
                                importBatch: { connect: { id: batch.id } },
                                source
                            }
                        });
                    }
                } else {
                    await projectTx.create({
                        data: {
                            projectName: deal.name,
                            pipedrive_deal_id: dIdNum,
                            client: clientId ? { connect: { id: clientId } } : undefined,
                            contact: contactId ? { connect: { id: contactId } } : undefined,
                            dealValue,
                            currency: deal.currency || null,
                            dealCreatedAt,
                            expectedCloseDate,
                            quoteFolder,
                            pipedriveDealUrl,
                            pipedriveOwnerId,
                            pipedriveOwnerName,
                            projectStatus: 'Budget',
                            importBatch: { connect: { id: batch.id } },
                            source
                        }
                    });
                }
                metrics.projects.committed++;
                metrics.projects.linked++;
            }
        }, { timeout: 120000 });

        if (metrics.projects.linked === 0 && metrics.projects.total > 0) throw new Error('Fundamentally broken mapping: 0 projects linked.');

        const finalStatus = (metrics.projects.skipped > 0 || metrics.contacts.unmatched > 0) ? 'WARNING' : 'SUCCESS';

        await prisma.importBatch.update({
            where: { id: batch.id },
            data: {
                status: finalStatus,
                completedAt: new Date(),
                totalClientsAttempted: metrics.clients.total,
                totalContactsAttempted: metrics.contacts.total,
                totalProjectsAttempted: metrics.projects.total,
                totalClientsCommitted: metrics.clients.committed,
                totalContactsCommitted: metrics.contacts.committed,
                totalProjectsCommitted: metrics.projects.committed,
                skippedDeals: metrics.projects.skipped,
                errorLog: { ...errorLog, metrics } as any
            }
        });
        return { id: batch.id, status: finalStatus, metrics };

    } catch (error: any) {
        console.error('Import Sync Failed:', error);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        await prisma.importBatch.update({
            where: { id: batch.id },
            data: {
                status: 'FAILED',
                completedAt: new Date(),
                totalClientsAttempted: metrics.clients.total,
                totalContactsAttempted: metrics.contacts.total,
                totalProjectsAttempted: metrics.projects.total,
                errorLog: { ...errorLog, metrics, validationErrors: [error.message] } as any
            }
        });
        throw error;
    } finally {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
    }
}

export async function deletePipedriveData(batchId?: string) {
    const source = 'pipedrive';
    const where = batchId ? { source, import_batch_id: batchId } : { source };
    const linked = await prisma.quote.count({ where: { project: { ...where } } });
    if (linked > 0) throw new Error(`Blocked: ${linked} quotes are linked.`);
    return await prisma.$transaction([
        prisma.project.deleteMany({ where }),
        prisma.contact.deleteMany({ where }),
        prisma.client.deleteMany({ where }),
    ]);
}
