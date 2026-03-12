import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Authentication Data...');

  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@chadwick.com.au';
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';

  // 1. Create Permissions
  const permissions = [
    { name: 'users:manage', description: 'Create, edit, and disable users' },
    { name: 'roles:manage', description: 'Manage roles and permissions' },
    { name: 'quotes:view_all', description: 'View all quotes in the system' },
    { name: 'quotes:edit_any', description: 'Edit any quote in the system' },
    { name: 'quotes:delete', description: 'Delete quotes' },
    { name: 'catalog:manage', description: 'Manage catalog items' },
    { name: 'settings:manage', description: 'Manage system and costing settings' },
    { name: 'analytics:view', description: 'View system analytics and metrics' },
    { name: 'admin:view_analytics', description: 'View system analytics and metrics' },
    { name: 'audit:view', description: 'View system audit logs' },
  ];

  console.log('Creating/Updating permissions...');
  for (const p of permissions) {
    await (prisma as any).permission.upsert({
      where: { name: p.name },
      update: { description: p.description },
      create: p,
    });
  }

  // 2. Create Roles
  console.log('Creating/Updating roles...');
  const adminRole = await (prisma as any).role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: {
      name: 'ADMIN',
      description: 'Full system access',
    },
  });

  const estimatorRole = await (prisma as any).role.upsert({
    where: { name: 'ESTIMATOR' },
    update: {},
    create: {
      name: 'ESTIMATOR',
      description: 'Full quoting functionality for owned quotes',
    },
  });

  const viewerRole = await (prisma as any).role.upsert({
    where: { name: 'VIEWER' },
    update: {},
    create: {
      name: 'VIEWER',
      description: 'Read-only access to quotes',
    },
  });

  // 3. Link Permissions to Roles
  console.log('Linking permissions to roles...');
  const allPermissions = await (prisma as any).permission.findMany();

  // Admin gets all
  for (const p of allPermissions) {
    await (prisma as any).rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: p.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: p.id,
      },
    });
  }

  // Estimator gets specific ones
  const estimatorPerms = ['quotes:view_all', 'catalog:manage', 'settings:manage'];
  for (const name of estimatorPerms) {
    const p = allPermissions.find((perm: any) => perm.name === name);
    if (p) {
      await (prisma as any).rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: estimatorRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: estimatorRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  // Viewer gets view_all
  const viewerPerms = ['quotes:view_all'];
  for (const name of viewerPerms) {
    const p = allPermissions.find((perm: any) => perm.name === name);
    if (p) {
      await (prisma as any).rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: viewerRole.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: viewerRole.id,
          permissionId: p.id,
        },
      });
    }
  }

  // 4. Create Initial Admin User (Only if no users exist)
  const userCount = await (prisma as any).user.count();
  
  if (userCount === 0) {
    console.log('No users found. Creating initial admin user from environment variables...');
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await (prisma as any).user.create({
      data: {
        email: ADMIN_EMAIL,
        name: 'System Admin',
        password: hashedPassword,
        roleId: adminRole.id,
        status: 'ACTIVE',
      },
    });
    console.log(`✅ Admin User created: ${ADMIN_EMAIL}`);
  } else {
    console.log('ℹ️ Users already exist in database. Skipping initial admin creation.');
  }

  console.log('✅ Authentication seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
