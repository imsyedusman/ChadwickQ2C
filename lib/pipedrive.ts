import prisma from './prisma';

/**
 * Server-side Pipedrive Service
 * 
 * Rules:
 * - ALL calls server-side only
 * - Use stored API token from Settings
 * - Handle null/missing gracefully
 */

async function getPipedriveToken(): Promise<string | null> {
    const settings = await (prisma as any).settings.findUnique({
        where: { id: 'global' },
        select: { pipedriveToken: true }
    });
    
    return settings?.pipedriveToken || process.env.PIPEDRIVE_API_TOKEN || null;
}

async function pipedriveFetch(endpoint: string, options: RequestInit = {}) {
    const token = await getPipedriveToken();
    if (!token) {
        throw new Error('Pipedrive API token not configured');
    }

    const url = new URL(`https://api.pipedrive.com/v1/${endpoint}`);
    url.searchParams.append('api_token', token);

    const response = await fetch(url.toString(), {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error(`Pipedrive API Error [${endpoint}]:`, error);
        throw new Error(error.error || `Pipedrive API responded with ${response.status}`);
    }

    return response.json();
}

export async function searchDeals(query: string) {
    if (!query) return [];
    try {
        const data = await pipedriveFetch(`deals/search?term=${encodeURIComponent(query)}`);
        // The search result items are wrapped in an item property
        return data.data?.items?.map((item: any) => item.item) || [];
    } catch (error) {
        console.error('Failed to search Pipedrive deals:', error);
        return [];
    }
}

export async function listDeals(options: { limit?: number, start?: number, sort?: string } = {}) {
    try {
        const { limit = 50, start = 0, sort = 'add_time DESC' } = options;
        const endpoint = `deals?limit=${limit}&start=${start}&sort=${encodeURIComponent(sort)}`;
        const data = await pipedriveFetch(endpoint);
        return data; // Return full response for pagination
    } catch (error) {
        console.error('Failed to list Pipedrive deals:', error);
        return null;
    }
}

export async function fetchDeal(dealId: number | string) {
    try {
        const data = await pipedriveFetch(`deals/${dealId}`);
        return data.data;
    } catch (error) {
        console.error(`Failed to fetch Pipedrive deal ${dealId}:`, error);
        return null;
    }
}

export async function fetchOrganization(orgId: number | string) {
    try {
        const data = await pipedriveFetch(`organizations/${orgId}`);
        return data.data;
    } catch (error) {
        console.error(`Failed to fetch Pipedrive organization ${orgId}:`, error);
        return null;
    }
}

export async function fetchPerson(personId: number | string) {
    try {
        const data = await pipedriveFetch(`persons/${personId}`);
        return data.data;
    } catch (error) {
        console.error(`Failed to fetch Pipedrive person ${personId}:`, error);
        return null;
    }
}

export async function testConnection(token: string) {
    try {
        const url = new URL('https://api.pipedrive.com/v1/users/me');
        url.searchParams.append('api_token', token);
        const response = await fetch(url.toString());
        return response.ok;
    } catch (error) {
        return false;
    }
}
