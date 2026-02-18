const puppeteer = require('puppeteer');

(async () => {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Capture console logs
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

    // Capture network requests
    page.on('request', request => {
        if (request.url().includes('/api/catalog')) {
            console.log('NETWORK REQ:', request.url());
        }
    });

    page.on('response', async response => {
        if (response.url().includes('/api/catalog')) {
            console.log('NETWORK RES:', response.url(), response.status());
            try {
                const json = await response.json();
                if (Array.isArray(json)) {
                    console.log(`Payload: ${json.length} items`);
                    const busbarItems = json.filter(i => i.category === 'Busbar' || i.category === 'Busbars');
                    console.log(`Payload Busbar Items: ${busbarItems.length}`);

                    // Check for cleats
                    const cleats = json.filter(i => i.partNumber && i.partNumber.startsWith('1B1-CLEAT'));
                    console.log(`Payload Cleats: ${cleats.length}`);
                    if (cleats.length > 0) {
                        console.log('Sample Cleat:', cleats[0]);
                    }
                }
            } catch (e) {
                // ignore
            }
        }
    });

    try {
        console.log('Navigating to app...');
        // Accessing a board page directly (assuming ID exists, if not we might need to list boards first)
        // For now, let's try to hit the root and see if we can get context, or just hit the API directly in browser context if needed.
        // But we need the UI logic.
        // Let's assume we can go to a quote page. If not known, we might need to find one.
        // Actually, running `debug-api-simulation` earlier didn't use browser.

        // Since I don't have a known board URL readily available without browsing, 
        // I will rely on the unit-test style execution of the component if possible, OR
        // I will trust the previous API signals.

        // Wait, the user said "Cleat items... are not visible in Item Selection."
        // I verified the API returns them.
        // The only remaining place is the Frontend filtering in `ItemSelection`.

        // Let's look at `ItemSelection.tsx` again.
        // "const filteredData = data;" -> there was a filter there before.

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();
