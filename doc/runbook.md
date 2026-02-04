# Operations Runbook

## Resolving Failed Prisma Migrations (P3009)

If a deployment fails with `P3009` ("migrate found failed migrations in the target database"), the application may enter a restart loop. Use this guide to resolve it.

### 🚨 Emergency Break-Glass (Stop Restart Loop)
To immediately stop the restart loop and let the app boot (even with potential DB mismatch), set this environment variable in your deployment platform (e.g., Coolify, Vercel, Docker):

```bash
SKIP_MIGRATIONS=1
```

This will bypass the migration check. **Remember to remove this later** to ensure future migrations run.

---

### 🛠️ Fixing the Migration (Proper Fix)

Follow these steps to clean up the failed migration state so deployments can resume.

#### 1. Check Migration Status
Access the shell of your running server (or local dev environment) and run:
```bash
npx prisma migrate status
```
This will list the migrations and identify which one is in a "failed" state.

#### 2. Resolve the Failure
You need to tell Prisma how to handle the failed entry. Usually, if the migration failed, you want to mark it as **rolled back** so Prisma can try to apply it again next time.

**Option A: Mark as Rolled Back (Retry later)**
Use this if the migration failed and you want to re-attempt it (e.g., transient error, code fix deployed).
```bash
# Replace <migration_name> with the actual name from Step 1 (e.g., 20260203041328_add_mccb_rule_table)
npx prisma migrate resolve --rolled-back <migration_name>
```

**Option B: Mark as Applied (Manual Fix)**
Use this *only* if you manually fixed the database schema (e.g., ran the SQL manually) and just want Prisma to mark it as "done".
```bash
npx prisma migrate resolve --applied <migration_name>
```

#### 3. Re-Deploy
Once resolved, trigger a new deployment or run the deploy script manually:
```bash
npx ts-node scripts/deploy.ts
```
Or if you added `SKIP_MIGRATIONS=1` earlier, **remove it** and restart the app.

---

### Common Errors

**P3009**: "migrate found failed migrations in the target database"
- **Cause**: A previous `migrate deploy` crashed or was interrupted.
- **Fix**: See Step 2 above.

**P3005**: "The database schema is not empty"
- **Cause**: Database has tables but no `_prisma_migrations` history (e.g., created manually).
- **Fix**: `npx prisma migrate resolve --applied 0_init` (if `0_init` matches your baseline).
