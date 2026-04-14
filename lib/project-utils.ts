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
