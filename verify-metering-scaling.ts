
// Mocking addWc to track results
function getChassisForFuses(totalFuseQty: number): string[] {
    const results: string[] = [];
    const addWc = (part: string, qty: number) => {
        for (let i = 0; i < qty; i++) results.push(part);
    };

    if (totalFuseQty > 6) {
        let fusesRemaining = totalFuseQty;
        while (fusesRemaining > 0) {
            if (fusesRemaining > 24) {
                addWc('100A-CHASSIS-30', 1);
                fusesRemaining -= 30;
            } else if (fusesRemaining > 18) {
                addWc('100A-CHASSIS-24', 1);
                fusesRemaining -= 24;
            } else {
                addWc('100A-CHASSIS-18', 1);
                fusesRemaining -= 18;
            }
        }
    }
    return results;
}

const testCases = [
    { fuses: 6, expected: [] },
    { fuses: 7, expected: ['100A-CHASSIS-18'] },
    { fuses: 12, expected: ['100A-CHASSIS-18'] },
    { fuses: 18, expected: ['100A-CHASSIS-18'] },
    { fuses: 19, expected: ['100A-CHASSIS-24'] },
    { fuses: 24, expected: ['100A-CHASSIS-24'] },
    { fuses: 25, expected: ['100A-CHASSIS-30'] },
    { fuses: 27, expected: ['100A-CHASSIS-30'] },
    { fuses: 30, expected: ['100A-CHASSIS-30'] },
    { fuses: 31, expected: ['100A-CHASSIS-30', '100A-CHASSIS-18'] },
    { fuses: 42, expected: ['100A-CHASSIS-30', '100A-CHASSIS-18'] },
    { fuses: 60, expected: ['100A-CHASSIS-30', '100A-CHASSIS-30'] },
    { fuses: 61, expected: ['100A-CHASSIS-30', '100A-CHASSIS-30', '100A-CHASSIS-18'] },
];

console.log('--- Metering Scaling Logic Verification (Isolated) ---');
let failed = false;

testCases.forEach(tc => {
    const actual = getChassisForFuses(tc.fuses);
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(tc.expected);
    
    if (actualStr === expectedStr) {
        console.log(`[PASS] Fuses: ${tc.fuses.toString().padEnd(2)} -> ${actualStr}`);
    } else {
        console.error(`[FAIL] Fuses: ${tc.fuses.toString().padEnd(2)} -> Expected ${expectedStr}, got ${actualStr}`);
        failed = true;
    }
});

if (!failed) {
    console.log('\nAll scaling test cases passed!');
} else {
    process.exit(1);
}
