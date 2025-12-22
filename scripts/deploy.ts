import { execSync } from 'child_process';

async function main() {
    console.log('🚀 Starting Safe Deployment Process...');

    try {
        // Attempt normal deployment
        console.log('🔄 Attempting migration deployment...');
        execSync('npx prisma migrate deploy', { stdio: 'pipe' }); // Pipe output to capture error if needed, but here we just try-catch
        console.log('✅ Migrations applied successfully.');

    } catch (error: any) {
        const errorMsg = error.message + (error.stdout ? error.stdout.toString() : '') + (error.stderr ? error.stderr.toString() : '');
        console.log('⚠️ Migration deployment failed.');

        // Check for P3005 (Schema not empty)
        if (errorMsg.includes('P3005') || errorMsg.includes('The database schema is not empty')) {
            console.log('💡 Detected non-empty database without migration history (P3005).');
            console.log('🛠️ Attempting to baseline with initial migration...');

            try {
                // Resolve the first migration (0_init) as applied
                // This tells Prisma: "The DB already has the implementation of 0_init, just mark it as done"
                execSync('npx prisma migrate resolve --applied 0_init', { stdio: 'inherit' });
                console.log('✅ Baseline successful (0_init marked as applied).');

                // Now run deploy again to ensure any *future* migrations strictly after 0_init (if any) are applied
                // In our current case, 0_init IS the only migration, but this is future-proof.
                console.log('🔄 Re-running migration deployment...');
                execSync('npx prisma migrate deploy', { stdio: 'inherit' });
                console.log('✅ Migrations synchronized.');

            } catch (resolveError) {
                console.error('❌ Failed to baseline database:', resolveError);
                process.exit(1);
            }
        } else {
            // Some other error, fail loudly
            console.error('❌ Critical Migration Error:', errorMsg);
            process.exit(1);
        }
    }

    console.log('✨ Database ready.');
}

main();
