import { generateDescriptionBullets, BoardLike } from "../lib/description-logic";

const boardsToTest: { name: string, board: BoardLike, expectedBullets: string[] }[] = [
  {
    name: "Power Meter Precision Test (Should NOT match 'CT Metering')",
    board: {
      name: "Precision Board",
      type: "Main Switchboard",
      items: [
        { name: "Current Transformer", category: "CT Metering", subcategory: "CT Metering", quantity: 3 }
      ]
    },
    expectedBullets: [] // No Power Meter(s) should appear
  },
  {
    name: "Power Meter Precision Test (Should match 'Power Meter')",
    board: {
      name: "Match Board",
      type: "Main Switchboard",
      items: [
        { name: "Digital Power Meter", category: "Metering", subcategory: "Power Meters", quantity: 1 }
      ]
    },
    expectedBullets: ["Power Meter(s)"]
  },
  {
    name: "Deduplication Test",
    board: {
      name: "Deduplication Board",
      type: "Main Switchboard",
      items: [
        { name: "Surge Diverter 1", category: "Switchgear", subcategory: "Surge Protection Equipment", quantity: 1 },
        { name: "Surge Diverter 2", category: "Switchboard", subcategory: "Surge Protection Equipment", quantity: 1 }
      ]
    },
    expectedBullets: ["Surge Diverter(s)"]
  },
  {
    name: "Ordering Test (Surge -> Meter -> ATS -> MTS -> Heater)",
    board: {
      name: "Ordering Board",
      type: "Main Switchboard",
      items: [
        { name: "MTS Switch", category: "Switches", subcategory: "MTS", quantity: 1 },
        { name: "ATS Switch", category: "Switches", subcategory: "ATS", quantity: 1 },
        { name: "Digital Power Meter", category: "Metering", subcategory: "Power Meters", quantity: 1 },
        { name: "Surge Diverter", category: "Misc", subcategory: "Surge Protection Equipment", quantity: 1 },
        { name: "Anti-condensation Heater", category: "Misc", subcategory: "Anti-condensation Heater", quantity: 1 }
      ]
    },
    expectedBullets: ["Surge Diverter(s)", "Power Meter(s)", "Automatic Transfer Switch", "Manual Transfer Switch", "Anti-condensation Heater(s)"]
  }
];

console.log("--- STARTING MAPPING PRECISION & ORDERING VERIFICATION ---");

let totalTests = boardsToTest.length;
let passedTests = 0;

boardsToTest.forEach(test => {
  console.log(`\nTesting Case: ${test.name}`);
  const bullets = generateDescriptionBullets(test.board);
  const autoBullets = bullets.filter(b => b.id.startsWith('auto-')).map(b => b.text);
  
  console.log(`Generated: ${JSON.stringify(autoBullets)}`);
  console.log(`Expected:  ${JSON.stringify(test.expectedBullets)}`);
  
  const isMatch = JSON.stringify(autoBullets) === JSON.stringify(test.expectedBullets);
  
  if (isMatch) {
    console.log("✅ PASSED");
    passedTests++;
  } else {
    console.log("❌ FAILED");
  }
});

console.log(`\n--- RESULTS: ${passedTests}/${totalTests} PASSED ---`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
