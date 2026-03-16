import http from 'http';

function main() {
    console.log('Testing GET /api/quotes via http...');
    http.get('http://localhost:3000/api/quotes', (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log('Status Code:', res.statusCode);
            try {
                const json = JSON.parse(data);
                console.log('Found', json.data?.length || 0, 'quotes');
                if (json.error) console.log('Error:', json.error);
            } catch (e) {
                console.log('Failed to parse JSON');
                console.log('Raw output (first 100 chars):', data.substring(0, 100));
            }
        });
    }).on('error', (err) => {
        console.error('Error:', err.message);
    });
}

main();
