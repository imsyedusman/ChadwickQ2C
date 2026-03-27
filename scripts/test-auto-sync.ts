import { DocxGenerator } from "../lib/docx-generator";

async function testAutoSync() {
  console.log("--- STARTING AUTO-SYNC VERIFICATION ---");

  // 1. Mock a board with an existing draft but NO surge diverter yet
  const board: any = {
    id: "board-1",
    name: "Main Switchboard",
    type: "Main Switchboard",
    items: [
      { name: "Existing Item", category: "Misc", quantity: 1 }
    ],
    descriptionOptions: {
      draft: [
        { id: "msb-specs", text: "Indoor, IP42, Form 3b, 25kA, AS61439" },
        { id: "manual-1", text: "My Manual Note" }
      ],
      editedIds: []
    }
  };

  console.log("Case 1: No surge diverter initially.");
  let data = DocxGenerator.generateBoardData(board, 1);
  console.log("Bullets:", JSON.stringify(data.bullets.map(b => b.text)));
  
  if (data.bullets.some(b => b.text.includes("Surge Diverter"))) {
    console.log("❌ FAILED: Surge Diverter should NOT be there yet.");
  } else {
    console.log("✅ PASSED");
  }

  // 2. Add a surge diverter item to the board
  console.log("\nCase 2: Adding Surge Diverter. Should appear automatically in 'bullets' even with draft exists.");
  board.items.push({ 
    name: "New Surge Diverter", 
    category: "Misc", 
    subcategory: "Surge Protection Equipment", 
    quantity: 1 
  });

  data = DocxGenerator.generateBoardData(board, 1);
  const bulletTexts = data.bullets.map(b => b.text);
  console.log("Bullets:", JSON.stringify(bulletTexts));

  const hasSurge = bulletTexts.includes("Surge Diverter(s)");
  if (hasSurge) {
    console.log("✅ PASSED: Surge Diverter appeared automatically.");
  } else {
    console.log("❌ FAILED: Surge Diverter did NOT appear.");
  }

  // 3. Ensure no duplication if run again
  console.log("\nCase 3: Ensure no duplication on multiple syncs.");
  data = DocxGenerator.generateBoardData(board, 1);
  if (data.bullets.filter(b => b.text === "Surge Diverter(s)").length === 1) {
    console.log("✅ PASSED: No duplication.");
  } else {
    console.log("❌ FAILED: Duplication detected.");
  }
  
  // 4. Ensure manual edits are preserved
  console.log("\nCase 4: Ensure manual edits in draft are preserved.");
  board.descriptionOptions.draft[1].text = "My Updated Manual Note";
  data = DocxGenerator.generateBoardData(board, 1);
  if (data.bullets.some(b => b.text === "My Updated Manual Note")) {
    console.log("✅ PASSED: Manual edits preserved.");
  } else {
    console.log("❌ FAILED: Manual edits lost.");
  }
}

testAutoSync().catch(console.error);
