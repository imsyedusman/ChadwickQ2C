import { execSync } from 'child_process';

async function main() {
    try {
        console.log('🌱 Starting Database Seeding...');

        // Busbars
        console.log('\n--- Seeding Busbars ---');
        // Using the same options as in package.json
        execSync('npx ts-node --compiler-options "{\\"module\\":\\"commonjs\\"}" scripts/import-busbars.ts', { stdio: 'inherit' });

        // Vendor Catalog
        console.log('\n--- Seeding Vendor Catalog ---');
        execSync('npx ts-node --compiler-options "{\\"module\\":\\"commonjs\\"}" scripts/import-vendor-catalog.ts', { stdio: 'inherit' });

        // Authentication
        console.log('\n--- Seeding Authentication ---');
        execSync('npx ts-node --compiler-options "{\\"module\\":\\"commonjs\\"}" scripts/seed-auth.ts', { stdio: 'inherit' });

        console.log('\n✅ Seeding Complete.');
    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

main();
