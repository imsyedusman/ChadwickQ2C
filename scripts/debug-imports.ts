
console.log("Checking imports...");
try {
    const service = require('../lib/board-item-service');
    console.log("Require ../lib/board-item-service: SUCCESS");
} catch (e: any) {
    console.error("Require ../lib/board-item-service: FAILED");
    console.error(e.message);
    console.error(e.code);
}

try {
    const prisma = require('@/lib/prisma');
    console.log("Require @/lib/prisma: SUCCESS");
} catch (e: any) {
    console.error("Require @/lib/prisma: FAILED");
    console.error(e.message);
}
