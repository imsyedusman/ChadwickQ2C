import prisma from '../lib/prisma';

async function main() {
  const boards = await prisma.board.findMany();
  
  if (boards.length === 0) {
    console.log("No boards found.");
    return;
  }
  const latestBoard = boards[boards.length - 1]; // Just picking the last returned
  console.log("ID:", latestBoard.id);
  console.log("Name:", latestBoard.name);
  console.log("Type:", latestBoard.type);
  console.log("Config JSON:", latestBoard.config);
}

main().catch(console.error).finally(() => prisma.$disconnect());
