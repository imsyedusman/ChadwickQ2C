
const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('data/catalog-backup.json', 'utf8'));

const items = data.items;
console.log(`Total items: ${items.length}`);

// Regex for MCCB patterns
const patterns = [
    /NSX\d+/,
    /NS\d+/,
    /Circuit Breaker/i,
    /MCCB/i
];


const categorySet = new Set();
matches.forEach(m => {
    categorySet.add(`${m.category} -> ${m.subcategory}`);
});

console.log('Unique Categories:');
Array.from(categorySet).forEach(c => console.log(c));

