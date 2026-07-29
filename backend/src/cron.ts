import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import whatsappService from './services/whatsapp';

const prisma = new PrismaClient();

// Run every night at midnight (0 0 * * *)
// For testing/development, you can trigger this logic manually or set a shorter interval
cron.schedule('0 0 * * *', async () => {
  console.log('Running nightly WhatsApp CRM automation job...');
  
  const today = new Date();
  const todayMonth = today.getMonth() + 1; // 1-12
  const todayDate = today.getDate(); // 1-31

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const endOfThreeDays = new Date();
  endOfThreeDays.setDate(endOfThreeDays.getDate() + 3);
  endOfThreeDays.setHours(23, 59, 59, 999);

  try {
    // -------------------------------------------------------------
    // 1. Birthday and Anniversaries Reminders
    // -------------------------------------------------------------
    const contacts = await prisma.contact.findMany({
      include: { familyMembers: true }
    });

    for (const contact of contacts) {
      for (const member of contact.familyMembers) {
        // Check Birthdays
        if (member.date_of_birth) {
          const dob = new Date(member.date_of_birth);
          if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate) {
            if (member.relation === 'self') {
              // Direct greeting to the contact
              const message = `🎉 Happy Birthday, ${contact.name}! Wishing you a wonderful day and a fantastic year ahead! - Sent via CRM`;
              await whatsappService.sendMessage(contact.phone, message);
            } else {
              // Reminder message to the main contact about their family member
              const message = `🎈 Hello ${contact.name}, wishing your ${member.relation} (${member.full_name}) a very Happy Birthday today! - Sent via CRM`;
              await whatsappService.sendMessage(contact.phone, message);
            }
          }
        }

        // Check Remembrance / Death Anniversaries
        if (member.date_of_death) {
          const dod = new Date(member.date_of_death);
          if (dod.getMonth() + 1 === todayMonth && dod.getDate() === todayDate) {
            const message = `🤍 Hello ${contact.name}, thinking of you today on the anniversary of your ${member.relation} ${member.full_name}'s passing. - Sent via CRM`;
            await whatsappService.sendMessage(contact.phone, message);
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Upcoming Rental Due Reminders (Direct to Clients)
    // -------------------------------------------------------------
    const upcomingRentals = await prisma.rental.findMany({
      where: {
        next_due_date: {
          gte: startOfToday,
          lte: endOfThreeDays
        }
      }
    });

    for (const rental of upcomingRentals) {
      const dueDateStr = new Date(rental.next_due_date).toLocaleDateString();
      const message = `🏠 Dear ${rental.client_name}, this is a friendly reminder that the rent of $${rental.rent_amount} for "${rental.property_name}" is due on ${dueDateStr}. Thank you! - Sent via CRM`;
      await whatsappService.sendMessage(rental.client_phone, message);
    }

    // -------------------------------------------------------------
    // 3. System Summary (Bills and Tasks) - Sent to CRM Admin Owner
    // -------------------------------------------------------------
    const upcomingBills = await prisma.bill.findMany({
      where: {
        is_active: true,
        next_due_date: {
          gte: startOfToday,
          lte: endOfThreeDays
        }
      }
    });

    const pendingTasks = await prisma.task.findMany({
      where: {
        status: 'pending',
        event_date: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });

    if (upcomingBills.length > 0 || pendingTasks.length > 0) {
      let summary = `*📋 Daily CRM Summary - ${today.toLocaleDateString()}*\n\n`;
      
      if (upcomingBills.length > 0) {
        summary += `*Upcoming Bills (Next 3 Days):*\n`;
        upcomingBills.forEach(b => {
          summary += `- ${b.title}: $${b.amount} (Due: ${new Date(b.next_due_date).toLocaleDateString()})\n`;
        });
        summary += `\n`;
      }
      
      if (pendingTasks.length > 0) {
        summary += `*Pending Tasks Due Today:*\n`;
        pendingTasks.forEach(t => {
          summary += `- ${t.title}${t.description ? ` (${t.description})` : ''}\n`;
        });
      }
      
      // Send the summary report to the logged-in admin number
      const status = whatsappService.getStatus();
      if (status.status === 'CONNECTED' && status.user?.number) {
        await whatsappService.sendMessage(status.user.number, summary);
      }
    }

    console.log('Nightly WhatsApp automation job executed successfully.');
  } catch (error) {
    console.error('Error executing nightly WhatsApp automation job:', error);
  }
});

console.log('Cron scheduler initialized.');
