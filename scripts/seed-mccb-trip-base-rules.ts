
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MAPPING_RULES = [
    // B3
    { base: 'C10B3', trip: 'C1035E100', variant: 'B3' },
    { base: 'C10B3', trip: 'C1036E100', variant: 'B3' },
    { base: 'C16B3', trip: 'C1635E160', variant: 'B3' },
    { base: 'C16B3', trip: 'C1636E160', variant: 'B3' },
    { base: 'C25B3', trip: 'C2535E250', variant: 'B3' },
    { base: 'C25B3', trip: 'C2536E250', variant: 'B3' },

    // F3
    { base: 'C10F3', trip: 'C1035E100', variant: 'F3' },
    { base: 'C10F3', trip: 'C1036E100', variant: 'F3' },
    { base: 'C16F3', trip: 'C1635E160', variant: 'F3' },
    { base: 'C16F3', trip: 'C1636E160', variant: 'F3' },
    { base: 'C25F3', trip: 'C2535E250', variant: 'F3' },
    { base: 'C25F3', trip: 'C2536E250', variant: 'F3' },
    { base: 'C40F3', trip: 'C4035E400', variant: 'F3' },
    { base: 'C40F3', trip: 'C4036E400', variant: 'F3' },
    { base: 'C63F3', trip: 'C6335E630', variant: 'F3' },
    { base: 'C63F3', trip: 'C6336E630', variant: 'F3' },

    // N3
    { base: 'C10N3', trip: 'C1035E100', variant: 'N3' },
    { base: 'C10N3', trip: 'C1036E100', variant: 'N3' },
    { base: 'C16N3', trip: 'C1635E160', variant: 'N3' },
    { base: 'C16N3', trip: 'C1636E160', variant: 'N3' },
    { base: 'C25N3', trip: 'C2535E250', variant: 'N3' },
    { base: 'C25N3', trip: 'C2536E250', variant: 'N3' },
    { base: 'C40N3', trip: 'C4035E400', variant: 'N3' },
    { base: 'C40N3', trip: 'C4036E400', variant: 'N3' },
    { base: 'C63N3', trip: 'C6335E630', variant: 'N3' },
    { base: 'C63N3', trip: 'C6336E630', variant: 'N3' },

    // H3
    { base: 'C10H3', trip: 'C1035E100', variant: 'H3' },
    { base: 'C10H3', trip: 'C1036E100', variant: 'H3' },
    { base: 'C16H3', trip: 'C1635E160', variant: 'H3' },
    { base: 'C16H3', trip: 'C1636E160', variant: 'H3' },
    { base: 'C25H3', trip: 'C2535E250', variant: 'H3' },
    { base: 'C25H3', trip: 'C2536E250', variant: 'H3' },
    { base: 'C40H3', trip: 'C4035E400', variant: 'H3' },
    { base: 'C40H3', trip: 'C4036E400', variant: 'H3' },
    { base: 'C63H3', trip: 'C6335E630', variant: 'H3' },
    { base: 'C63H3', trip: 'C6336E630', variant: 'H3' },

    // NS630b-1600 (High Amp)
    // 33460 -> 630bN
    { base: '33460', trip: '47058', variant: '630bN' },
    { base: '33460', trip: '47061', variant: '630bN' },
    { base: '33460', trip: '47059', variant: '630bN' },
    { base: '33460', trip: '47062', variant: '630bN' },

    // 33466 -> 800N
    { base: '33466', trip: '47058', variant: '800N' },
    { base: '33466', trip: '47061', variant: '800N' },
    { base: '33466', trip: '47059', variant: '800N' },
    { base: '33466', trip: '47062', variant: '800N' },

    // 33472 -> 1000N
    { base: '33472', trip: '47058', variant: '1000N' },
    { base: '33472', trip: '47061', variant: '1000N' },
    { base: '33472', trip: '47059', variant: '1000N' },
    { base: '33472', trip: '47062', variant: '1000N' },

    // 33478 -> 1250N
    { base: '33478', trip: '47058', variant: '1250N' },
    { base: '33478', trip: '47061', variant: '1250N' },
    { base: '33478', trip: '47059', variant: '1250N' },
    { base: '33478', trip: '47062', variant: '1250N' },

    // 33482 -> 1600N
    { base: '33482', trip: '47058', variant: '1600N' },
    { base: '33482', trip: '47061', variant: '1600N' },
    { base: '33482', trip: '47059', variant: '1600N' },
    { base: '33482', trip: '47062', variant: '1600N' },

    // SAU Chassis - derived from description or context
    // We treat the "Variant" as the chassis key itself if needed, or better, the "12-way" part
    // But since the pairing is 1-to-1 based on the Trip Part (Chassis), we can map directly.
    // However, the rule table requires (Trip, Variant) -> Base.
    // If the Trip part is unique to the variant (like SAU25012183), then the variant can be anything constant or derived.
    // Let's use "SAU" as generic variant if the trip part is unique?
    // User request: "variant from description (12-way...)"
    // The Input mapping: Base (SAU25...?) -> Base (SAU40...?)
    // Ah, wait. The request says: "SAU25012183 -> SAU40012183"
    // Which one is trip and which is base?
    // "Base items must be system managed". Usually the "Base" is the frame, and Trip is the logic.
    // But for Chassis: "SAU250..." (250A) vs "SAU400..." (400A).
    // The user mapping says: SAU250... -> SAU400...
    // Is SAU250 the "Trip"? Or is it a Chassis upgrade?
    // "Implement automatic MCCB Electronic Trip Unit -> Base pairing"
    // Assuming SAU250xxxxx is the thing the user adds, and SAU400xxxxx is the thing that gets added?
    // Or maybe it's a substitution.
    // Let's assume Left is Base, Right is Trip?
    // In previous mappings: C10B3 (Base) -> C1035E100 (Trip).
    // So Key is Base, Value is Trip.
    // C10B3 -> C1035E100 means C10B3 is the Base.
    // So for SAU: SAU25012183 -> SAU40012183.
    // Does that mean SAU25... is Base and SAU40... is Trip?
    // Or vice versa?
    // Usually 250A chassis is cheaper/smaller than 400A?
    // Let's check the logic: "When a Trip Unit is added... automatically add Base".
    // Reference: "C10B3 -> C1035E100".
    // If I add C1035E100 (Trip), I get C10B3 (Base).
    // So Mapping provided is Base -> Trip.
    // So SAU250... is Base for SAU400...?
    // That seems weird. 400A Trip inside 250A Base? No.
    // Maybe SAU400... is the Trip/Kit and SAU250... is the Base Chassis?
    // Whatever, I will follow the pattern Base -> Trip.
    // Base: SAU25012183, Trip: SAU40012183.
    // So if User adds SAU40012183, we add Base SAU25012183.
    // Let's stick to that.

    // SAU Rules...
    { base: 'SAU25012183', trip: 'SAU40012183', variant: 'SAU' },
    { base: 'SAU25018183', trip: 'SAU40018183', variant: 'SAU' },
    { base: 'SAU25024183', trip: 'SAU40024183', variant: 'SAU' },
    { base: 'SAU25036183', trip: 'SAU40036183', variant: 'SAU' },
    { base: 'SAU25048183', trip: 'SAU40048183', variant: 'SAU' },
    { base: 'SAU25060183', trip: 'SAU40060183', variant: 'SAU' },
    { base: 'SAU25072183', trip: 'SAU40072183', variant: 'SAU' },
    { base: 'SAU25084183', trip: 'SAU40084183', variant: 'SAU' },
    { base: 'SAU25096183', trip: 'SAU40096183', variant: 'SAU' },
    { base: 'SAU250108183', trip: 'SAU400108183', variant: 'SAU' }
];

// Helper to get partial match string for variant
function getContextFilter(variant: string): any {
    if (variant === 'B3') return { OR: [{ subcategory: { contains: 'B3' } }, { category: { contains: '25kA' } }] };
    if (variant === 'F3') return { OR: [{ subcategory: { contains: 'F3' } }, { category: { contains: '36kA' } }] };
    if (variant === 'N3') return { OR: [{ subcategory: { contains: 'N3' } }, { category: { contains: '50kA' } }] };
    if (variant === 'H3') return { OR: [{ subcategory: { contains: 'H3' } }, { category: { contains: '70kA' } }] };
    if (variant.endsWith('N')) return {}; // High amp usually distinct by part number?
    return {};
}

async function main() {
    console.log('Seeding MCCB Trip->Base Rules and Updating Catalog Items...');

    for (const rule of MAPPING_RULES) {
        // 1. Upsert Rule
        await (prisma as any).mccbTripBaseRule.upsert({
            where: {
                tripPartNumber_variant: {
                    tripPartNumber: rule.trip,
                    variant: rule.variant
                }
            },
            update: {
                basePartNumber: rule.base
            },
            create: {
                tripPartNumber: rule.trip,
                variant: rule.variant,
                basePartNumber: rule.base
            }
        });

        // 2. Update Trip Catalog Items (Set Variant & Role)
        // We attempt to find catalog items matching this Part Number AND the Variant Context
        const contextFilter = getContextFilter(rule.variant);

        // Note: For High Amp (630bN etc) and SAU, part number is likely unique enough or we fallback to just part number?
        const whereClause: any = { partNumber: rule.trip };
        if (Object.keys(contextFilter).length > 0) {
            Object.assign(whereClause, contextFilter);
        }

        const updatedTrips = await (prisma as any).catalogItem.updateMany({
            where: whereClause,
            data: {
                mccbVariant: rule.variant,
                mccbRole: 'TRIP_UNIT'
            }
        });

        // 3. Update Base Catalog Items (Set Role)
        // Bases are simple targets, just mark them as BASE.
        await (prisma as any).catalogItem.updateMany({
            where: { partNumber: rule.base },
            data: {
                mccbRole: 'BASE',
                // Optional: set mccbVariant on Base too if useful?
                mccbVariant: rule.variant
            }
        });

        process.stdout.write('.');
    }
    console.log('\nDone.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
