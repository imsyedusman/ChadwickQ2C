import { POST } from '../app/api/catalog/compare/route';

async function testCompare() {
    console.log("Testing catalog compare endpoint...");

    const mockRequest = {
        json: async () => ({
            items: [
                {
                    brand: 'Schneider Electric',
                    partNumber: 'MOCK-PART-1',
                    description: 'Mock Item 1',
                    category: 'Basics',
                    unitPrice: 120.50
                },
                {
                    brand: 'Schneider Electric',
                    partNumber: 'MOCK-NEW-2',
                    description: 'Mock New Item 2',
                    category: 'Switchboard',
                    unitPrice: 50.00
                }
            ]
        })
    } as unknown as Request;

    const response = await POST(mockRequest);
    const data = await response.json();

    console.log("Response Summary:", JSON.stringify(data.summary, null, 2));
    if (data.error) {
        console.error("Error:", data.error);
        process.exit(1);
    }
}

testCompare()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
