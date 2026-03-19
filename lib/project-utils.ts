export function getProjectClientDisplay(project: { client?: { name: string } | null, clientName?: string | null }) {
    return project.client?.name || project.clientName || '---';
}

export function getProjectCompanyDisplay(project: { client?: { name: string } | null, companyName?: string | null }) {
    return project.companyName || (project.client?.name ? 'Imported Client' : 'No Company');
}

export function getProjectContactDisplay(project: { contact?: { name: string } | null }) {
    return project.contact?.name || '---';
}
