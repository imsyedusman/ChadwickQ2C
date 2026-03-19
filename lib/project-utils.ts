export function getProjectClientDisplay(project: { contact?: { name: string } | null, clientName?: string | null }) {
    // Client (Person) = Contact
    const name = project.contact?.name || 'No Contact';
    
    // Dev-mode guard against source labels
    if (process.env.NODE_ENV === 'development' && (name === 'Imported Client' || name === 'pipedrive')) {
        console.warn(`[ProjectUtils] Source label "${name}" detected in Client (Person) name field.`, project);
    }
    
    return name;
}

export function getProjectCompanyDisplay(project: { client?: { name: string } | null, companyName?: string | null }) {
    // Company (Organization) = Client
    const name = project.client?.name || 'No Company';

    // Dev-mode guard: ensure we never return "Imported Client" or "pipedrive"
    if (process.env.NODE_ENV === 'development' && (name === 'Imported Client' || name === 'pipedrive')) {
        console.warn(`[ProjectUtils] Source label "${name}" detected in Company (Organization) name field.`, project);
    }

    return name;
}

export function getProjectContactDisplay(project: { contact?: { name: string } | null }) {
    // Contact display remains just the person name
    return project.contact?.name || '---';
}
