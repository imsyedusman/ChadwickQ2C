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
