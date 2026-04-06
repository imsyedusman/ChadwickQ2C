import prisma from './prisma';
import bcrypt from 'bcryptjs';

export async function getOrCreateDefaultAdminUser() {
    try {
        // 1. Check if any user exists
        const count = await (prisma as any).user.count();
        if (count > 0) {
            // Return first available user (prioritize ADMIN)
            return await (prisma as any).user.findFirst({
                where: { status: 'ACTIVE' },
                orderBy: { role: { name: 'asc' } }
            }) || await (prisma as any).user.findFirst();
        }

        console.log('[UserUtils] No users found. Creating default admin user.');

        // 2. Ensure ADMIN role exists
        let adminRole = await (prisma as any).role.findUnique({
            where: { name: 'ADMIN' }
        });

        if (!adminRole) {
            adminRole = await (prisma as any).role.create({
                data: {
                    name: 'ADMIN',
                    description: 'Full system access'
                }
            });
        }

        // 3. Create default admin user
        const hashedPassword = await bcrypt.hash('Developer@2k26!', 10);
        const defaultAdmin = await (prisma as any).user.create({
            data: {
                email: 'admin@chadwickswitchboards.com.au',
                name: 'Admin',
                password: hashedPassword,
                roleId: adminRole.id,
                status: 'ACTIVE'
            }
        });

        console.log('[UserUtils] Default admin user created successfully.');
        return defaultAdmin;
    } catch (error) {
        console.error('[UserUtils] Failed to get or create default admin:', error);
        return null;
    }
}
/**
 * Resolves a valid User ID from a session or fallback, ensuring it exists in the DB
 * to prevent Foreign Key constraint violations.
 */
export async function getResolvedUserId(session: any): Promise<string> {
    const sessionUserId = (session?.user as any)?.id;
    const sessionUserEmail = (session?.user as any)?.email;

    // 1. Check if session ID exists in DB
    if (sessionUserId) {
        const user = await (prisma as any).user.findUnique({ where: { id: sessionUserId } });
        if (user) return user.id;
    }

    // 2. Fallback to Email if ID resolution failed
    if (sessionUserEmail) {
        const user = await (prisma as any).user.findUnique({ where: { email: sessionUserEmail } });
        if (user) return user.id;
    }

    // 3. Last Fallback: Get or create default admin
    const defaultAdmin = await getOrCreateDefaultAdminUser();
    if (defaultAdmin) return defaultAdmin.id;

    throw new Error('No valid user found or could be created in database.');
}
