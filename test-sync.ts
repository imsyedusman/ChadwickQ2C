import { PrismaClient } from '@prisma/client';
import { syncBoardItems } from './lib/board-item-service.ts';

const prisma = new PrismaClient();

async function testSync() {
    const boardId = '1c514a14-a5b0-4ea7-91e0-2a467eaae561';
    
    console.log("Fetching board...");
    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
        console.error("Board not found");
        return;
    }
    
    console.log("Inserting a fake duplicate Busbar Insulation...");
    const existing = await prisma.item.findFirst({ where: { boardId, name: 'Busbar Insulation' } });
    if (existing) {
        await prisma.item.create({
            data: {
                ...existing,
                id: undefined,
                unitPrice: 99.99,
                labourHours: 5,
                createdAt: undefined,
                updatedAt: undefined
            }
        });
    }

    const config = JSON.parse(board.config || '{}');
    config.id = boardId;
    
    console.log("Before sync, Busbar Insulation items:");
    const before = await prisma.item.findMany({ where: { boardId, name: 'Busbar Insulation' }, orderBy: { unitPrice: 'asc' } });
    console.log(before.map(i => `${i.id} - p:${i.unitPrice} d:${i.isDefault}`));
    
    console.log("\nRunning syncBoardItems...");
    await syncBoardItems(boardId, config);
    
    console.log("\nAfter sync, Busbar Insulation items:");
    const after = await prisma.item.findMany({ where: { boardId, name: 'Busbar Insulation' }, orderBy: { unitPrice: 'asc' } });
    console.log(after.map(i => `${i.id} - p:${i.unitPrice} d:${i.isDefault}`));
    
    console.log("\nAfter sync, BB-400A items:");
    const bbAfter = await prisma.item.findMany({ where: { boardId, name: 'BB-400A' } });
    console.log(bbAfter.map(i => `${i.id} - p:${i.unitPrice} d:${i.isDefault} sys:${i.isSystemManaged}`));
}

testSync().catch(console.error).finally(() => prisma.$disconnect());
