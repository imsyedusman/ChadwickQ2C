import prisma from './prisma';

export async function logAction(userId: string | null | undefined, action: string, entity?: string, entityId?: string, details?: any) {
    try {
        await (prisma.auditLog as any).create({
            data: {
                userId,
                action,
                entity,
                entityId,
                details: details ? JSON.stringify(details) : null,
            }
        });
    } catch (error) {
        console.error('Failed to create audit log:', error);
        // We don't want to fail the main operation if logging fails
    }
}
