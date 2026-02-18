const http = require('http');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.log('Raw data:', data);
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

async function main() {
    console.log('--- API FETCH DIAGNOSTIC ---');

    const baseUrl = 'http://localhost:3000'; // Assumption

    try {
        // 1. Fetch Tree for Busbar
        console.log('\n[1] Fetching Tree (category=Busbar)...');
        const tree = await fetchUrl(`${baseUrl}/api/catalog?mode=tree&category=Busbar`);
        console.log(`Received ${tree.length} subcategories.`);
        const cleatSubcat = 'Busbar Supports - Required for Custom Boards Only';
        if (tree.includes(cleatSubcat)) {
            console.log('SUCCESS: Cleat subcategory found in tree.');
        } else {
            console.log('FAILURE: Cleat subcategory NOT found in tree.');
            console.log('Tree:', tree);
        }

        // 2. Fetch Items
        console.log('\n[2] Fetching Items (category=Busbar, subcategory=...)');
        const encodedSub = encodeURIComponent(cleatSubcat);
        const items = await fetchUrl(`${baseUrl}/api/catalog?category=Busbar&subcategory=${encodedSub}&take=10`);
        console.log(`Received ${items.length} items.`);
        if (items.some(i => i.partNumber.startsWith('1B1-CLEAT'))) {
            console.log('SUCCESS: Cleat items found.');
        } else {
            console.log('FAILURE: Cleat items NOT found.');
        }

    } catch (error) {
        console.error('Fetch failed:', error.message);
    }
}

main();
