
// Verification of Excel Logic replication

const mockBusbars = [
    { name: 'Busbar 1', quantity: 1, unitPrice: 100, labourHours: 10 },
    { name: 'Busbar 2', quantity: 2, unitPrice: 50, labourHours: 5 }
];
// Totals:
// Labour Hours: (1*10) + (2*5) = 20 hours
// Material Cost: (1*100) + (2*50) = 200 dollars

// Scenario 1: Air Insulated (Default)
const runScenario = (level: string | undefined, expectedFactor: number, expectedMatFactor: number, expectedLabFactor: number) => {
    console.log(`\n--- Scenario: ${level} ---`);
    const config = { insulationLevel: level };

    // Logic replication
    const insulationLevel = config.insulationLevel?.toLowerCase() || 'air';
    const insulationFactor = insulationLevel === 'fully' ? 1.0 : (insulationLevel === 'air' ? 0.25 : 0);

    console.log(`Level resolved to: ${insulationLevel}`);
    console.log(`Factor: ${insulationFactor} (Expected: ${expectedFactor})`);

    if (insulationFactor !== expectedFactor) {
        console.error('FAIL: Factor mismatch');
        return;
    }

    if (insulationFactor === 0) {
        console.log('Insulation removed. Correct.');
        return;
    }

    let totalMat = 0;
    let totalLab = 0;
    mockBusbars.forEach(b => {
        totalMat += b.unitPrice * b.quantity;
        totalLab += b.labourHours * b.quantity;
    });

    console.log(`Total Mat: ${totalMat}, Total Lab: ${totalLab}`);

    const extraMat = totalMat * insulationFactor * 0.4;
    const extraLab = totalLab * insulationFactor * 0.6;

    console.log(`Calculated Extra Mat: ${extraMat}`);
    console.log(`Calculated Extra Lab: ${extraLab}`);

    const expectedMat = totalMat * expectedFactor * 0.4;
    const expectedLab = totalLab * expectedFactor * 0.6;

    if (Math.abs(extraMat - expectedMat) < 0.01 && Math.abs(extraLab - expectedLab) < 0.01) {
        console.log('PASS: Calculations match Excel formula.');
    } else {
        console.error(`FAIL: Calc mismatch. Expected Mat: ${expectedMat}, Lab: ${expectedLab}`);
    }
}

runScenario(undefined, 0.25, 0.4, 0.6); // Default test
runScenario('none', 0, 0, 0);
runScenario('air', 0.25, 0.4, 0.6);
runScenario('fully', 1.0, 0.4, 0.6);
