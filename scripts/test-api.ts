async function main() {
    console.log('Testing GET /api/quotes...');
    const res = await fetch('http://localhost:3000/api/quotes', {
        headers: {
            'Cookie': '' // Need auth if testing locally, but maybe it works if no auth required for GET (usually it does)
        }
    });
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Body:', JSON.stringify(data, null, 2));
}

main().catch(console.error);
