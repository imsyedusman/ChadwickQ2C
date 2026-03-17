const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const dmParts = [
        'A9MEM3155', 'A9MEM3355', 'A9MEM3255', 'METSEPM3250', 'METSEPM5110',
        'METSEPM5350', 'METSEPM5560', 'METSEPM8240', 'EM2172RVV53XOSX',
        'EM24DINAV93XISX', 'EM24DINAV53DISX', 'MF72421', 'NEMO96HD1000',
        'NEMO96HD1300', 'EM27072DMV53X2SN', '48250402', '48250403', '48250500', '48250501'
    ];
    for (const dm of dmParts) {
         const item = await prisma.catalogItem.findUnique({
            where: { partNumber: dm }
        });
        if (item && item.components) {
             console.log(`[DM] ${dm} components: ${JSON.stringify(item.components, null, 2)}`);
        } else if (item) {
             console.log(`[DM] ${dm}: No components`);
        } else {
             console.log(`[DM] ${dm}: MISSING FROM CATALOG`);
        }
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
