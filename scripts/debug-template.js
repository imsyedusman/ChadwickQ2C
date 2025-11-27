const fs = require('fs');
const PizZip = require('pizzip');
const path = require('path');

const filePath = path.join(__dirname, '../public/Estimating Standard Tender To Print.docx');

try {
    const content = fs.readFileSync(filePath);
    const zip = new PizZip(content);
    const docXml = zip.file("word/document.xml").asText();

    console.log("--- XML Snippets around placeholders ---");

    // Regex to find potential split tags or tags
    // Looking for {{ ... }} or {# ... } or {/ ... }
    // But since they might be split by XML tags, we search for curlies

    // Simple check: do we see the exact strings?
    const tags = [
        '{#boards}', '{/boards}',
        '{#bullets}', '{/bullets}',
        '{{clientName}}', '{{totalPrice}}',
        '{{itemNo}}', '{{boardTitle}}', '{{text}}', '{{qty}}', '{{price}}'
    ];

    tags.forEach(tag => {
        const index = docXml.indexOf(tag);
        if (index === -1) {
            console.log(`[MISSING/SPLIT] Could not find exact tag: "${tag}"`);
            // Try to find parts of it
            const start = tag.substring(0, 2);
            const end = tag.substring(tag.length - 2);
            // This is a naive check, but might help
        } else {
            console.log(`[OK] Found tag: "${tag}"`);
        }
    });

    console.log("\n--- Searching for split tags (heuristic) ---");
    // Look for '{' followed by XML tags then '#' or '{'
    // e.g. <w:t>{</w:t>...<w:t>#boards</w:t>

    // Let's just dump the XML around where we expect tags
    // We can look for "boards"
    const keywords = ["boards", "bullets", "clientName"];
    keywords.forEach(kw => {
        const regex = new RegExp(`.{0,100}${kw}.{0,100}`, 'g');
        let match;
        while ((match = regex.exec(docXml)) !== null) {
            console.log(`\nContext for "${kw}":`);
            console.log(match[0]);
        }
    });

} catch (e) {
    console.error("Error reading file:", e);
}
