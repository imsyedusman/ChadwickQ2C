import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { id, field, value } = body;

        if (!id || !field) {
            return NextResponse.json({ error: 'Quote ID and Field are required' }, { status: 400 });
        }

        // Valid Quote model fields (excluding relations and metadata)
        const VALID_QUOTE_FIELDS = [
            'clientName', 'clientCompany', 'projectRef', 
            'description', 'status', 'notes', 'gridInternalNotes', 
            'revisionGroupId', 'projectId', 'total'
        ];

        if (!VALID_QUOTE_FIELDS.includes(field)) {
            // Check if we are updating project status (which is on the project model)
            if (field === 'projectStatus' && body.projectId) {
                await (prisma as any).project.update({
                    where: { id: body.projectId },
                    data: { projectStatus: value }
                });
                
                // Return early if it was only a project update
                // Or continue if there's more? User says "Inline editing should update one field only"
                return NextResponse.json({ message: 'Project status updated' });
            }
            return NextResponse.json({ error: `Invalid field: ${field}` }, { status: 400 });
        }

        console.log(`[BulkUpdate] Updating ${field} for quote ${id}`, { value });
        
        // Update the quote fields
        const updatedQuote = await (prisma as any).quote.update({
            where: { id },
            data: { [field]: value },
            include: {
                project: true,
                modifier: {
                    select: { name: true, email: true }
                }
            }
        });

        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error('Failed to update quote:', error);
        // Return more specific error message if possible
        const errorMessage = (error as any).message || 'Failed to update quote';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
