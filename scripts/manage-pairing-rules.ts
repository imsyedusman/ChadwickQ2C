import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { normalizePartNumber } from '../lib/normalization';

const prisma = new PrismaClient();

// Hardcoded fallback rules
const FALLBACK_RULES = [
    { input: 'SAU25012183', output: 'enb12' },
    { input: 'SAU25018183', output: 'enb18' },
    { input: 'SAU25024183', output: 'enb24' },
    { input: 'SAU25036183', output: 'enb36' },
    { input: 'SAU25048183', output: 'enb48' },
    { input: 'SAU25060183', output: 'enb60' },
    { input: 'SAU25072183', output: 'enb72' },
    { input: 'SAU25084183', output: 'enb84' },
    { input: 'SAU25096183', output: 'enb96' },
    { input: 'SAU250108183', output: 'enb108' },
    { input: 'SAU40012183', output: 'enb12' },
    { input: 'SAU40018183', output: 'enb18' },
    { input: 'SAU40024183', output: 'enb24' },
    { input: 'SAU40036183', output: 'enb36' },
    { input: 'SAU40048183', output: 'enb48' },
    { input: 'SAU40060183', output: 'enb60' },
    { input: 'SAU40072183', output: 'enb72' },
    { input: 'SAU40084183', output: 'enb84' },
    { input: 'SAU40096183', output: 'enb96' },
    { input: 'SAU400108183', output: 'enb108' },
];

async function main() {
    const RULE_TYPE = 'MCB_CHASSIS_TO_NE_LINK_165A';
    const args = process.argv.slice(2);
    const useJson = args.includes('--json');
    const jsonPath = args.find(a => a.endsWith('.json')) || 'pairing-rules.json';

    let rulesToLoad = FALLBACK_RULES;

    if (useJson) {
        try {
            const content = await fs.readFile(path.resolve(process.cwd(), jsonPath), 'utf-8');
            const jsonRules = JSON.parse(content);
            if (Array.isArray(jsonRules)) {
                rulesToLoad = jsonRules.map((r: any) => ({
                    input: normalizePartNumber(r.input || r.chassisPartNumber),
                    output: normalizePartNumber(r.output || r.linksPartNumber)
                }));
                console.log(`Loaded ${rulesToLoad.length} rules from ${jsonPath}`);
            }
        } catch (e: any) {
            console.warn(`Failed to generate rules from JSON: ${e.message}. Using fallback.`);
        }
    }

    console.log(`Upserting ${rulesToLoad.length} rules for ${RULE_TYPE}...`);

    for (const rule of rulesToLoad) {
        await prisma.pairingRule.upsert({
            where: {
                ruleType_inputPartNumber: {
                    ruleType: RULE_TYPE,
                    inputPartNumber: normalizePartNumber(rule.input)
                }
            },
            update: {
                outputPartNumber: normalizePartNumber(rule.output)
            },
            create: {
                ruleType: RULE_TYPE,
                inputPartNumber: normalizePartNumber(rule.input),
                outputPartNumber: normalizePartNumber(rule.output)
            }
        });
    }

    const count = await prisma.pairingRule.count({ where: { ruleType: RULE_TYPE } });
    const sau250 = await prisma.pairingRule.count({ where: { ruleType: RULE_TYPE, inputPartNumber: { startsWith: 'SAU250' } } });
    const sau400 = await prisma.pairingRule.count({ where: { ruleType: RULE_TYPE, inputPartNumber: { startsWith: 'SAU400' } } });

    console.log(`Done. Total rules for ${RULE_TYPE}: ${count}`);
    console.log(`- SAU250 rules loaded: ${sau250}`);
    console.log(`- SAU400 rules loaded: ${sau400}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
