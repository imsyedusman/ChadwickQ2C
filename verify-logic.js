
const { generateDescriptionBullets } = require('./lib/description-logic');

const testBoards = [
    {
        name: "Test MSB",
        type: "Main Switchboard (MSB)",
        config: {
            form: "3bih", // New pattern
            ipRating: "IP42",
            faultRating: "36"
        },
        items: []
    },
    {
        name: "Test DB",
        type: "Distribution Board (DB)",
        config: {
            formRating: "2bi", // Legacy pattern
            ipRating: "IP65",
            faultRating: "10"
        },
        items: [
            { name: "Main Switch", category: "Circuit Breakers", quantity: 1 }
        ]
    }
];

testBoards.forEach(board => {
    console.log(`\nTesting Board: ${board.name}`);
    const bullets = generateDescriptionBullets(board);
    bullets.forEach((b, i) => console.log(`  ${i+1}. ${b.text}`));
});

// Partial check for correct mapping
const msbBullets = generateDescriptionBullets(testBoards[0]);
const firstBullet = msbBullets[0].text;
if (firstBullet.includes("Form 3bih")) {
    console.log("\n✅ SUCCESS: Form 3bih mapped correctly.");
} else {
    console.log("\n❌ FAILURE: Form 3bih NOT mapped correctly. Got: " + firstBullet);
}

if (firstBullet.includes("36kA")) {
    console.log("✅ SUCCESS: 36kA mapped correctly.");
} else {
    console.log("❌ FAILURE: 36kA NOT mapped correctly.");
}
