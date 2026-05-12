import { NextRequest, NextResponse } from 'next/server';
import { syncPipedriveData, deletePipedriveData, normalizeValue, extractFirstValue, normalizeId } from '@/lib/pipedrive-import';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

function hardenHeader(header: string): string {
    return header
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const organizationsMap = {
    pipedrive_org_id: ['organisation_id', 'org_id', 'id'],
    name: ['organisation_name', 'name', 'title', 'organization_name']
};

const peopleMap = {
    pipedrive_person_id: ['person_id', 'id'],
    name: ['person_name', 'name', 'full_name'],
    org_id: ['person_organisation_id', 'person_organization_id', 'org_id', 'organization_id'],
    email: ['person_email_work', 'person_email_home', 'person_email_other', 'email'],
    phone: ['person_phone_mobile', 'person_phone_work', 'phone']
};

const dealsMap = {
    pipedrive_deal_id: ['deal_id', 'id'],
    name: ['deal_title', 'title', 'name'],
    org_id: ['deal_organisation_id', 'deal_organization_id', 'org_id', 'organization_id'],
    person_id: ['deal_contact_person_id', 'person_id', 'contact_person_id'],
    value: ['value', 'deal_value', 'deal_value_value'],
    currency: ['currency', 'deal_currency'],
    add_time: ['add_time', 'created_date', 'deal_created_date'],
    expected_close_date: ['expected_close_date', 'close_date', 'deal_expected_close_date'],
    quote_folder: ['47359133abef167a5b3ec1276f449c3743ce970f', 'quote_folder'],
    pipedriveOwnerName: ['owner_name', 'deal_owner_name', 'owner'],
    pipedriveOwnerId: ['owner_id', 'deal_owner_id']
};

function mapRow(row: any, mapping: Record<string, string[]>): any {
    const normalizedRow: Record<string, any> = {};
    Object.keys(row).forEach(key => {
        normalizedRow[hardenHeader(key)] = row[key];
    });

    const result: Record<string, any> = {};
    Object.entries(mapping).forEach(([targetKey, sourceKeys]) => {
        let foundValue: any = null;
        for (const sourceKey of sourceKeys) {
            if (normalizedRow[sourceKey] !== undefined && normalizedRow[sourceKey] !== null) {
                foundValue = normalizedRow[sourceKey];
                break;
            }
        }
        
        // IDs must be strictly normalized
        if (['pipedrive_org_id', 'pipedrive_person_id', 'pipedrive_deal_id', 'org_id', 'person_id'].includes(targetKey)) {
            result[targetKey] = normalizeId(foundValue);
        } else if (targetKey === 'email' || targetKey === 'phone') {
            result[targetKey] = extractFirstValue(foundValue);
        } else {
            result[targetKey] = normalizeValue(foundValue);
        }
    });
    return result;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const history = await prisma.importBatch.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
        const activeBatch = await prisma.importBatch.findFirst({
            where: {
                status: 'PENDING',
                lastHeartbeatAt: { gt: new Date(Date.now() - 10 * 60 * 1000) }
            }
        });
        return NextResponse.json({ history, activeBatch });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const orgsFile = formData.get('organizations') as File;
        const peopleFile = formData.get('people') as File;
        const dealsFile = formData.get('deals') as File;
        const mode = (formData.get('mode') || 'UPDATE') as 'UPDATE' | 'REPLACE';
        const debug = formData.get('debug') === 'true';

        if (!orgsFile || !peopleFile || !dealsFile) {
            return NextResponse.json({ error: 'Missing required files' }, { status: 400 });
        }

        const orgsRaw = await parseCSV<any>(orgsFile);
        const peopleRaw = await parseCSV<any>(peopleFile);
        const dealsRaw = await parseCSV<any>(dealsFile);

        const orgs = orgsRaw.map(r => mapRow(r, organizationsMap));
        const people = peopleRaw.map(r => mapRow(r, peopleMap));
        const deals = dealsRaw.map(r => mapRow(r, dealsMap));

        // Initial validation for mandatory fields after mapping
        const invalidOrg = orgs.find(o => !o.pipedrive_org_id || !o.name);
        if (invalidOrg) return NextResponse.json({ error: !invalidOrg.pipedrive_org_id ? 'Missing Organisation - ID mapping' : 'Missing Organisation - Name mapping' }, { status: 400 });

        const invalidPerson = people.find(p => !p.pipedrive_person_id || !p.name);
        if (invalidPerson) return NextResponse.json({ error: !invalidPerson.pipedrive_person_id ? 'Missing Person - ID mapping' : 'Missing Person - Name mapping' }, { status: 400 });

        const invalidDeal = deals.find(d => !d.pipedrive_deal_id || !d.name || !d.org_id);
        if (invalidDeal) {
            let msg = 'Missing Deal validation field';
            if (!invalidDeal.pipedrive_deal_id) msg = 'Missing Deal - ID mapping';
            else if (!invalidDeal.name) msg = 'Missing Deal - Title mapping';
            else if (!invalidDeal.org_id) msg = 'Missing Deal - Organisation ID mapping';
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const result = await syncPipedriveData(orgs, people, deals, { mode, debug });
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const batchId = searchParams.get('batchId') || undefined;
        await deletePipedriveData(batchId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function parseCSV<T>(file: File): Promise<T[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<T>(sheet, { defval: null });
}
