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

    // 3. Upsert Related Entities first
    const client = pipedrive_org_id ? await upsertPipedriveOrganization(pipedrive_org_id) : null;
    const contact = pipedrive_person_id ? await upsertPipedrivePerson(pipedrive_person_id, client?.id) : null;

    // 4. Strict ID-based upsert for Project
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
            projectStatus: 'Budget',
            source: 'pipedrive'
        }
    });

    return project;
}
