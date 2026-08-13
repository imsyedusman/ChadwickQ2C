import prisma from '@/lib/prisma';
import { syncBoardItems, BoardConfig } from '@/lib/board-item-service';

export async function createBoard(params: {
    quoteId: string;
    name: string;
    type: string;
    config?: BoardConfig;
}) {
    let { quoteId, name, type, config } = params;

    // Normalise type
    if (type) {
        const typeUpper = type.toUpperCase();
        if (typeUpper.includes('MSB') || typeUpper.includes('MAIN SWITCHBOARD')) {
            type = 'Main Switchboard (MSB)';
        } else if (typeUpper.includes('MDB') || typeUpper.includes('MAIN DISTRIBUTION BOARD')) {
            type = 'Main Distribution Board (MDB)';
        } else if (typeUpper.includes('DB') || typeUpper.includes('DISTRIBUTION BOARD')) {
            type = 'Distribution Board (DB)';
        } else if (typeUpper.includes('PREWIRED WHOLE CURRENT METER PANEL')) {
            type = 'Prewired Whole Current Meter Panel';
        } else if (typeUpper.includes('SUPPLY AUTHORITY CT METERING ENCLOSURE')) {
            type = 'Supply Authority CT Metering Enclosure 200-400A';
        } else if (typeUpper.includes('TEE-OFF-BOX RISER')) {
            type = 'Tee-Off-Box Riser';
        } else if (typeUpper.includes('TEE-OFF-BOX END OF RUN')) {
            type = 'Tee-Off-Box End of Run';
        } else if (typeUpper.includes('REMOTE METER PANEL WITH TEST BLOCK')) {
            type = 'Remote Meter Panel with Test Block';
        }
    }

    if (config) {
        // Normalise location
        if (typeof config.location === 'string') {
            const locLower = config.location.toLowerCase();
            if (locLower === 'indoor') config.location = 'Indoor';
            else if (locLower === 'outdoor') config.location = 'Outdoor';
        }

        // Normalise booleans to Yes/No
        const normalizeBool = (val: any) => {
            if (typeof val === 'string') {
                const lower = val.toLowerCase();
                if (lower === 'yes' || lower === 'true') return 'Yes';
                if (lower === 'no' || lower === 'false') return 'No';
            }
            return val;
        };

        const stringBooleans = ['ctMetering', 'baseRequired', 'meterPanel', 'cableZones', 'includesAcbs', 'ctSpareProvision', 'extraForDoorsOver', 'wholeCurrentMetering', 'isOver50kA', 'isNonStandardColour', 'drawingRef'];
        for (const key of stringBooleans) {
            if ((config as any)[key] !== undefined) {
                (config as any)[key] = normalizeBool((config as any)[key]);
            }
        }

        // 1. Fix cross-wired enclosureType and material fields
        const knownMaterials = [
            'Powder Coated Mild Steel',
            'Powder 316 Stainless Steel',
            '316 Stainless Steel Natural Finish',
            'Aluminium',
            'Marine Grade Aluminium',
            'Mild Steel'
        ];
        const knownEnclosureTypes = ['Custom', 'Cubic'];

        if (typeof config.enclosureType === 'string' && knownMaterials.includes(config.enclosureType)) {
            config.material = config.enclosureType;
            (config as any).enclosureType = undefined;
        }

        if (typeof config.enclosureDepth === 'string' && knownEnclosureTypes.includes(config.enclosureDepth)) {
            config.enclosureType = config.enclosureDepth;
            (config as any).enclosureDepth = undefined;
        }

        // 2. Rescue ipRating from any field
        const ipRegex = /^IP\d{2}$/i;
        const isIpCorrect = typeof config.ipRating === 'string' && ipRegex.test(config.ipRating);
        
        if (!isIpCorrect) {
            for (const key of Object.keys(config)) {
                if (key !== 'ipRating' && typeof (config as any)[key] === 'string' && ipRegex.test((config as any)[key])) {
                    config.ipRating = (config as any)[key];
                    (config as any)[key] = undefined;
                    break;
                }
            }
        }

        // --- Apply wizard business rules ---
        
        // Rule 1 — Outdoor forces Custom enclosure
        if (config.location === 'Outdoor' && (config.enclosureType === 'Cubic' || !config.enclosureType)) {
            config.enclosureType = 'Custom';
        }

        // Rule 2 — Cubic forces Mild Steel material
        if (config.enclosureType === 'Cubic') {
            config.material = 'Mild Steel';
        }

        // Rule 2b — Validate material against allowed list for location/enclosureType combination
        if (config.material) {
            let allowedMaterials: string[] = [];
            if (config.enclosureType === 'Cubic') {
                allowedMaterials = ['Mild Steel'];
            } else if (config.location === 'Outdoor' && config.enclosureType === 'Custom') {
                allowedMaterials = ['Powder Coated Mild Steel', 'Powder 316 Stainless Steel', '316 Stainless Steel Natural Finish'];
            } else {
                allowedMaterials = ['Powder Coated Mild Steel', 'Powder 316 Stainless Steel', '316 Stainless Steel Natural Finish', 'Aluminium', 'Marine Grade Aluminium'];
            }

            if (!allowedMaterials.includes(config.material)) {
                config.material = undefined;
            }
        }

        // Rule 3 — Auto-calculate enclosureDepth
        if (config.currentRating) {
            if (typeof config.enclosureDepth === 'string') {
                config.enclosureDepth = config.enclosureDepth.replace(/mm$/i, '');
            }
            
            const amps = parseInt(config.currentRating.replace(/[^0-9]/g, '')) || 0;
            let calcDepth = '400';
            
            if (amps <= 400) {
                calcDepth = '400';
            } else if (amps > 400 && amps <= 1600) {
                calcDepth = '600';
            } else if (amps >= 1600 && config.includesAcbs === 'Yes') {
                calcDepth = '800';
            } else if (amps >= 1600) {
                calcDepth = '600';
            }
            
            if (config.enclosureDepth !== calcDepth) {
                config.enclosureDepth = calcDepth;
            }
        }

        // Rule 4 — CT Metering forces Meter Panel
        if (config.ctMetering === 'Yes') {
            config.meterPanel = 'Yes';
        }

        // Rule 5 — Validate and normalise ipRating
        if (config.ipRating) {
            config.ipRating = config.ipRating.toUpperCase();
            let allowedIps: string[] = [];
            
            if (config.location === 'Outdoor') {
                allowedIps = ['IP56', 'IP65'];
            } else if (config.enclosureType === 'Cubic') {
                allowedIps = ['IP42', 'IP43', 'IP44', 'IP54'];
            } else {
                allowedIps = ['IP42', 'IP43', 'IP44', 'IP54', 'IP55', 'IP56', 'IP65', 'IP66'];
            }
            
            if (!allowedIps.includes(config.ipRating)) {
                config.ipRating = '';
            }
        }

        if (config.location === 'Outdoor' && (!config.ipRating || config.ipRating === '')) {
            config.ipRating = 'IP56';
        }
    }

    // Strict Contract: Reject legacy ratings for new boards
    if (config?.currentRating === '4000A' || config?.faultRating === '63kA') {
        throw new Error(`Legacy ratings (${config.currentRating || config.faultRating}) are no longer supported for new boards.`);
    }

    const count = await prisma.board.count({ where: { quoteId } });

    const mccbVariant = config?.faultRating ?
        (config.faultRating.includes('10kA') ? 'B3' :
            config.faultRating.includes('25kA') ? 'B3' :
                config.faultRating.includes('36kA') ? 'F3' :
                    config.faultRating.includes('50kA') ? 'N3' :
                        config.faultRating.includes('70kA') ? 'H3' : 'B3')
        : 'B3';

    const newBoard = await prisma.board.create({
        data: {
            quoteId,
            name,
            type,
            order: count,
            config: config ? JSON.stringify(config) : null,
            mccbVariant,
        } as any,
    });

    if (config) {
        await syncBoardItems(newBoard.id, config);

        // Auto-add default items based on Pre-Selection Logic and Admin Settings
        const autoAddBasics = await prisma.catalogItem.findMany({
            where: {
                category: 'Basics',
                isAutoAdd: true,
                partNumber: {
                    notIn: ['MISC-LABELS', 'MISC-HARDWARE', 'MISC-DELIVERY-HIAB', 'MISC-DELIVERY-UTE', 'MISC-TEST-TIERS']
                }
            }
        });

        const itemsToAdd = autoAddBasics.map((item: any) => ({
            boardId: newBoard.id,
            category: 'Basics',
            subcategory: item.subcategory || null,
            name: item.partNumber || item.description,
            description: item.description,
            unitPrice: item.unitPrice,
            labourHours: item.labourHours || 0,
            quantity: item.defaultQuantity || 1,
            cost: item.unitPrice * (item.defaultQuantity || 1),
            isDefault: true
        }));

        if (itemsToAdd.length > 0) {
            await prisma.item.createMany({
                data: itemsToAdd
            });
        }
    }

    return newBoard;
}

export function prepareBoardCloneData(board: any, overrides: any = {}) {
    // Extract only the fields that should be cloned
    const {
        id,
        createdAt,
        updatedAt,
        items,
        quote,
        quoteId,
        ...rest
    } = board;

    // Merge with overrides
    return {
        ...rest,
        ...overrides
    };
}
