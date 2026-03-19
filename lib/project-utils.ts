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

export function getProjectContactDisplay(project: { contact?: { name: string } | null }) {
    // Contact display remains just the person name (Client)
    return project.contact?.name || '---';
}
