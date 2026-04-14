export function getProjectClientDisplay(project: { contact?: { name: string } | null, clientName?: string | null }) {
    // Client (Person) Priority: contact.name -> clientName -> "No Contact"
    const name = project.contact?.name || project.clientName || 'No Contact';
    return name;
}

export function getProjectCompanyDisplay(project: { client?: { name: string } | null, companyName?: string | null }) {
    // Company (Organization) Priority: client.name -> companyName -> "No Company"
    const name = project.client?.name || project.companyName || 'No Company';
    return name;
}

export function getProjectContactDisplay(project: { contact?: { name: string } | null, clientName?: string | null }) {
    // Contact display Priority: contact.name -> clientName -> "No Contact"
    return project.contact?.name || project.clientName || 'No Contact';
}

/**
 * Normalizes a project name for grouping and routing.
 * Trims whitespace, converts to lowercase, and replaces multiple spaces with a single space.
 */
export function normalizeProjectName(name: string | null | undefined): string {
    if (!name) return 'unnamed project';
    return name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

/**
 * Returns consistent styling and labels for project statuses.
 */
export function getProjectStatusDisplay(status: string) {
    const statusMap: Record<string, { label: string; className: string }> = {
        'Budget': { label: 'Budget', className: 'bg-purple-100 text-purple-700 border-purple-200' },
        'Tender': { label: 'Tender', className: 'bg-orange-100 text-orange-700 border-orange-200' },
        'Live': { label: 'Live', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    };
    return statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' };
}
