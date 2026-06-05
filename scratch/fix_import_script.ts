import fs from 'fs';
import path from 'path';

const filePath = path.join('c:', 'Work', '01 - Chadwick', '01 - Q2C', 'Web App', 'ChadwickQ2C', 'scripts', 'import-basics.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of brand: null, with brand: 'Internal',
content = content.replace(/brand:\s*null,\s*\/\/\s*Basics are internal items without a vendor brand/g, "brand: 'Internal', // Basics are internal items without a vendor brand");
content = content.replace(/brand:\s*null,/g, "brand: 'Internal',");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated import-basics.ts');
