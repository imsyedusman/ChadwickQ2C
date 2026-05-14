import prisma from './prisma';
import { fetchOrganization, fetchPerson, fetchDeal } from './pipedrive';

/**
 * Pipedrive ID-based Upsert Utility
 * Ensures clean linking and prevents duplicates.
 * Standardized across the application.
 */

export async function upsertPipedriveOrganization(orgId: number | string) {
    if (!orgId) return null;
    const pipedrive_org_id = Number(orgId);
    
    // 1. Fetch latest data from Pipedrive
    const orgData = await fetchOrganization(pipedrive_org_id);
    if (!orgData) return null;

    // 2. Strict ID-based upsert
    const client = await (prisma as any).client.upsert({
        where: { pipedrive_org_id },
        update: { 
            name: orgData.name,
            updatedAt: new Date()
        },
        create: {
            name: orgData.name,
            pipedrive_org_id,
            source: 'pipedrive'
        }
    });

    return client;
}

export async function upsertPipedrivePerson(personId: number | string, clientId?: string | null) {
    if (!personId) return null;
    const pipedrive_person_id = Number(personId);

    // 1. Fetch latest data from Pipedrive
    const personData = await fetchPerson(pipedrive_person_id);
    if (!personData) return null;

    // 2. Strict ID-based upsert
    const contact = await (prisma as any).contact.upsert({
        where: { pipedrive_person_id },
        update: { 
            name: personData.name,
            email: personData.email?.[0]?.value || null,
            phone: personData.phone?.[0]?.value || null,
            clientId: clientId || undefined,
            updatedAt: new Date()
        },
        create: {
            name: personData.name,
            email: personData.email?.[0]?.value || null,
            phone: personData.phone?.[0]?.value || null,
            pipedrive_person_id,
            source: 'pipedrive',
            clientId: clientId || undefined
        }
    });

    return contact;
}

export async function upsertPipedriveDealAsProject(dealId: number | string) {
    if (!dealId) return null;
    const pipedrive_deal_id = Number(dealId);

    // 1. Fetch latest data from Pipedrive
    const dealData = await fetchDeal(pipedrive_deal_id);
    if (!dealData) return null;

    // 2. Extract IDs
    const pipedrive_org_id = dealData.org_id?.value || (typeof dealData.org_id === 'number' ? dealData.org_id : null);
    const pipedrive_person_id = dealData.person_id?.value || (typeof dealData.person_id === 'number' ? dealData.person_id : null);

    // 3. Extract Owner info (Standardized)
    const pipedriveOwnerId = dealData.user_id?.id || (typeof dealData.user_id === 'number' ? dealData.user_id : null);
    const pipedriveOwnerName = dealData.user_id?.name || dealData.owner_name || null;

    // 4. Upsert Related Entities first
    const client = pipedrive_org_id ? await upsertPipedriveOrganization(pipedrive_org_id) : null;
    const contact = pipedrive_person_id ? await upsertPipedrivePerson(pipedrive_person_id, client?.id) : null;

    // 5. Fetch existing project to check for owner changes (for audit logging)
    const existingProject = await (prisma as any).project.findUnique({
        where: { pipedrive_deal_id }
    });

    if (existingProject) {
        // Log owner change if it happens
        if (pipedriveOwnerId && existingProject.pipedriveOwnerId !== pipedriveOwnerId) {
            console.log(`[Pipedrive Sync] Owner Changed for Project ${existingProject.id}: ${existingProject.pipedriveOwnerName || 'None'} -> ${pipedriveOwnerName}`);
        }
    }

    // 6. Parsing helper
    const parsePipedriveDate = (d: any) => {
        if (!d) return null;
        try {
            const date = new Date(d);
            return isNaN(date.getTime()) ? null : date;
        } catch { return null; }
    };
    const expectedCloseDate = parsePipedriveDate(dealData.expected_close_date);

    // 7. Strict ID-based upsert for Project
    const project = await (prisma as any).project.upsert({
        where: { pipedrive_deal_id },
        update: { 
            projectName: dealData.title,
            clientName: dealData.person_name || null,
            companyName: dealData.org_name || null,
            clientId: client?.id || undefined,
            contactId: contact?.id || undefined,
            dealValue: dealData.value || null,
            currency: dealData.currency || null,
            expectedCloseDate,
            // Sync Safety: Only update owner if non-null
            ...(pipedriveOwnerId ? { pipedriveOwnerId } : {}),
            ...(pipedriveOwnerName ? { pipedriveOwnerName } : {}),
            updatedAt: new Date()
        },
        create: {
            projectName: dealData.title,
            pipedrive_deal_id,
            clientName: dealData.person_name || null,
            companyName: dealData.org_name || null,
            clientId: client?.id || undefined,
            contactId: contact?.id || undefined,
            dealValue: dealData.value || null,
            currency: dealData.currency || null,
            expectedCloseDate,
            pipedriveOwnerId,
            pipedriveOwnerName,
            projectStatus: 'Tender',
            source: 'pipedrive'
        }
    });

    return project;
}
