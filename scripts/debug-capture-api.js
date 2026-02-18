const fs = require('fs');

async function main() {
    const baseUrl = 'http://localhost:3000';
    console.log('--- API CAPTURE SCRIPT (Subcategory Focus) ---');

    try {
        const subcat = 'Busbar Supports - Required for Custom Boards Only';
        const encodedSub = encodeURIComponent(subcat);

        // 1. Capture Items with EXACT Subcategory
        const itemsUrl = `${baseUrl}/api/catalog?category=Busbar&subcategory=${encodedSub}&take=500`;
        console.log(`Fetching URL: ${itemsUrl}`);

        const itemsRes = await fetch(itemsUrl);
        console.log(`Response Status: ${itemsRes.status} ${itemsRes.statusText}`);

        const itemsJson = await itemsRes.json();

        fs.writeFileSync('debug-response-items-subcat.json', JSON.stringify(itemsJson, null, 2));
        console.log(`Saved ${itemsJson.length} items to debug-response-items-subcat.json`);

        if (itemsJson.length === 0) {
            console.log('FAILURE: No items found for this subcategory.');
        } else {
            console.log('SUCCESS: Items found.');
            const cleats = itemsJson.filter(i => i.partNumber && i.partNumber.startsWith('1B1-CLEAT'));
            console.log(`Cleat items in response: ${cleats.length}`);
        }

    } catch (e) {
        console.error('Capture failed:', e);
    }
}

main();
