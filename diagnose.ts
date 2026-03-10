import { execSync } from 'child_process';
import * as fs from 'fs';

try {
    const output = execSync('npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script').toString();
    fs.writeFileSync('diff.sql', output);
} catch (e) {
    console.error(e);
}
