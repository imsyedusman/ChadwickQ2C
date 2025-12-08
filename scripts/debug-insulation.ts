
// Mock of the logic in board-item-service.ts

const BUSBAR_INSULATION_ITEM = 'Busbar Insulation';

const mockExistingItems = [
    { name: 'BBC-800A-2', category: 'Busbar', quantity: 1, unitPrice: 308, labourHours: 0 },
    { name: 'BBC-1100A', category: 'Busbar', quantity: 2, unitPrice: 462, labourHours: 0 }
];

const config = { insulationLevel: 'fully' };

// Mock Maps
const itemQuantities = new Map();
const customPricing = new Map();
const customLabour = new Map();
const targetItemPartNumbers = new Set();
const catalogMap = new Map();

const addTarget = (partNumber: any, qty: any, unitPrice: any, labourHours: any) => {
    console.log(`[addTarget] ${partNumber}, Qty: ${qty}, Price: ${unitPrice}, Labour: ${labourHours}`);
    targetItemPartNumbers.add(partNumber);
    itemQuantities.set(partNumber, qty);
    if (unitPrice !== undefined) customPricing.set(partNumber, unitPrice);
    if (labourHours !== undefined) customLabour.set(partNumber, labourHours);
};

function runLogic() {
    console.log('--- START SIMULATION ---');
    console.log('Existing Items:', mockExistingItems);
    console.log('Config:', config);

    const insulationLevel = config.insulationLevel?.toLowerCase() || 'none';
    const hasInsulation = insulationLevel === 'air' || insulationLevel === 'fully';
    const insulationFactor = insulationLevel === 'fully' ? 1.0 : (insulationLevel === 'air' ? 0.25 : 0);

    console.log(`Insulation Level: ${insulationLevel}, Factor: ${insulationFactor}`);

    const effectiveBusbarItems = new Map();

    mockExistingItems.forEach(item => {
        if (item.name === BUSBAR_INSULATION_ITEM) return;

        const isBusbar = (item.category?.toUpperCase() === 'BUSBAR') ||
            (item.name.startsWith('BB-') || item.name.startsWith('BBC-'));

        console.log(`Item ${item.name}: isBusbar=${isBusbar} (Cat=${item.category?.toUpperCase()}, Prefix=${item.name.substring(0, 3)})`);

        if (isBusbar) {
            effectiveBusbarItems.set(item.name, {
                qty: item.quantity,
                price: item.unitPrice,
                labour: item.labourHours,
                category: item.category
            });
        }
    });

    // Calc Totals
    let totalBusbarMaterial = 0;
    let totalBusbarLabour = 0;

    effectiveBusbarItems.forEach((val) => {
        console.log(`Adding Item: Qty ${val.qty} * Price ${val.price}`);
        totalBusbarMaterial += (val.price * val.qty);
        totalBusbarLabour += (val.labour * val.qty);
    });

    console.log(`Total Material: ${totalBusbarMaterial}`);
    console.log(`Total Labour: ${totalBusbarLabour}`);

    if (hasInsulation && (totalBusbarMaterial > 0 || totalBusbarLabour > 0)) {
        const extraMaterial = totalBusbarMaterial * insulationFactor * 0.6;
        const extraLabour = totalBusbarLabour * insulationFactor * 0.4;

        console.log(`Calculating Extra: Mat=${extraMaterial}, Lab=${extraLabour}`);

        addTarget(BUSBAR_INSULATION_ITEM, 1, extraMaterial, extraLabour);
    } else {
        console.log('No insulation added (conditions not met)');
    }

    // Checking final target list
    console.log('Target Items (Set):', Array.from(targetItemPartNumbers));

    // Simulate the bug: Stale array vs New Array
    const staleArray = Array.from(mockExistingItems.map(i => i.name)); // Initial set
    // Busbar logic adds to Set...

    const finalArray = Array.from(targetItemPartNumbers);
    console.log('Final Array for DB Ops:', finalArray);

    const isInFinal = finalArray.includes(BUSBAR_INSULATION_ITEM);
    console.log(`Item in Final DB Array: ${isInFinal}`);

    const partNumber = BUSBAR_INSULATION_ITEM;
    const existingItem = false;
    const catalogItem = undefined;

    // Check line 487 logic
    const skip = !existingItem && !catalogItem && !customPricing.has(partNumber);
    console.log(`Skip Condition for ${partNumber}: ${skip}`);
}

runLogic();
