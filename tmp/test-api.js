async function testAPI() {
    try {
        const quotesRes = await fetch('http://localhost:3000/api/quotes', {
            headers: { 'Cookie': 'next-auth.session-token=mock-token' } // We can't easily mock session here, but let's see if it works without session for GET
        });
        console.log('Quotes API Status:', quotesRes.status);
        if (quotesRes.ok) {
            const data = await quotesRes.json();
            console.log('Quotes API Data Count:', data.data?.length);
        }

        // Test project detail - pick an ID from the earlier script
        const projectId = '9fbdce61-0d18-4ba1-9512-ee5946c64632'; // Mock ID from previous run
        const projectRes = await fetch(`http://localhost:3000/api/projects/${projectId}`);
        console.log('Project Detail API Status:', projectRes.status);

    } catch (e) {
        console.error('Error testing API:', e.message);
    }
}

testAPI();
