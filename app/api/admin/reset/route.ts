import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;

        if (!user || user.role !== 'ADMIN') {
            return new NextResponse('Unauthorized', { status: 403 });
        }

        const { action } = await req.json();

        if (action === 'RESET_QUOTES') {
            await prisma.$transaction(async (tx) => {
                // Delete all quotes - cascading takes care of boards and items
                // Use deleteMany for bulk deletion
                await tx.quote.deleteMany({});
                
                // Log action AFTER successful deletion
                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: 'RESET_QUOTES',
                        entity: 'QUOTE',
                        details: JSON.stringify({ 
                            timestamp: new Date().toISOString(),
                            scope: 'All Quotes and related child records (Boards, Items, ShareLinks)'
                        })
                    }
                });
            });
            return NextResponse.json({ success: true, message: 'All quotes have been reset.' });
        } 
        
        if (action === 'RESET_PROJECTS_FULL') {
            await prisma.$transaction(async (tx) => {
                // 1. Disconnect all quotes from projects to avoid FK issues
                await tx.quote.updateMany({
                    data: { projectId: null }
                });

                // 2. Delete all projects
                await tx.project.deleteMany({});

                // 3. Delete all contacts
                await tx.contact.deleteMany({});

                // 4. Delete all clients
                await tx.client.deleteMany({});

                // 5. Delete all import batches
                await tx.importBatch.deleteMany({});

                // Log action AFTER successful deletion
                await tx.auditLog.create({
                    data: {
                        userId: user.id,
                        action: 'RESET_PROJECTS_FULL',
                        entity: 'PROJECT',
                        details: JSON.stringify({ 
                            timestamp: new Date().toISOString(),
                            scope: 'All Projects, Clients, Companies (Clients), Contacts, and Pipedrive Import Batches'
                        })
                    }
                });
            });
            return NextResponse.json({ success: true, message: 'All projects and related data have been reset.' });
        }

        return new NextResponse('Invalid Action', { status: 400 });

    } catch (error: any) {
        console.error('Data Reset Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'An error occurred during data reset.' },
            { status: 500 }
        );
    }
}
