import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Run every night at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Running nightly cron job for bills and recurrences...');
  
  // Here we would scan the 'bills' and 'rentals' tables to see if anything is due
  // within the next 3 days. Since this is a placeholder cron, we just log for now.
  // Example logic:
  // const upcomingBills = await prisma.bill.findMany({
  //   where: { due_date: { lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) } }
  // });
  // for (const bill of upcomingBills) {
  //   await prisma.notification.create({ ... })
  // }
});

console.log('Cron scheduler initialized.');
