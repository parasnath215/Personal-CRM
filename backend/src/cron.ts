import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import whatsappService from './services/whatsapp';
import https from 'https';
import http from 'http';

const prisma = new PrismaClient();

// -------------------------------------------------------------
// Keep-Awake Self Ping (Runs every 10 mins)
// -------------------------------------------------------------
cron.schedule('*/10 * * * *', () => {
  const targetUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
  if (targetUrl) {
    const healthEndpoint = `${targetUrl.replace(/\/$/, '')}/api/health`;
    const requestModule = healthEndpoint.startsWith('https') ? https : http;
    requestModule.get(healthEndpoint, (res) => {
      console.log(`[Keep-Awake] Self-ping status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error(`[Keep-Awake] Self-ping error: ${err.message}`);
    });
  }
});

// -------------------------------------------------------------
// Core Daily Wishes & Reminders Function
// -------------------------------------------------------------
export async function executeDailyWishesAndReminders() {
  console.log('🔄 Executing WhatsApp CRM Birthday & Anniversary Automation Check...');
  
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

  let birthdayWishesSent = 0;
  let anniversaryWishesSent = 0;
  let remembranceSent = 0;
  let notificationsCreated = 0;

  try {
    // -------------------------------------------------------------
    // 1. Birthday and Anniversaries Check for Contacts & Family
    // -------------------------------------------------------------
    const contacts = await prisma.contact.findMany({
      include: { familyMembers: true }
    });

    for (const contact of contacts) {
      // A. Contact Direct Birthday Check
      if (contact.date_of_birth) {
        const dob = new Date(contact.date_of_birth);
        if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate) {
          const message = `🎉 Happy Birthday, ${contact.name}! Wishing you a wonderful day filled with joy, health, and success! 🎂✨ - Sent via CRM`;
          await whatsappService.sendMessage(contact.phone, message);
          birthdayWishesSent++;

          await prisma.dashboardNotification.create({
            data: {
              type: 'birthday',
              contact_id: contact.id,
              message: `🎉 Happy Birthday wish sent to ${contact.name} (${contact.phone})`
            }
          });
          notificationsCreated++;
        }
      }

      // B. Contact Direct Marriage Anniversary Check
      if (contact.marriage_anniversary) {
        const anniv = new Date(contact.marriage_anniversary);
        if (anniv.getMonth() + 1 === todayMonth && anniv.getDate() === todayDate) {
          const message = `💑 Happy Marriage Anniversary, ${contact.name}! Wishing you and your spouse a lifetime of togetherness, happiness, and love! 🥂💖 - Sent via CRM`;
          await whatsappService.sendMessage(contact.phone, message);
          anniversaryWishesSent++;

          await prisma.dashboardNotification.create({
            data: {
              type: 'anniversary',
              contact_id: contact.id,
              message: `💑 Marriage Anniversary wish sent to ${contact.name} (${contact.phone})`
            }
          });
          notificationsCreated++;
        }
      }

      // C. Family Members Birthday, Marriage Anniversary & Death Anniversary Check
      for (const member of contact.familyMembers) {
        // Birthday Check
        if (member.date_of_birth) {
          const dob = new Date(member.date_of_birth);
          if (dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate) {
            if (member.relation === 'self') {
              const message = `🎉 Happy Birthday, ${contact.name}! Wishing you a wonderful day and a fantastic year ahead! 🎂✨ - Sent via CRM`;
              await whatsappService.sendMessage(contact.phone, message);
              birthdayWishesSent++;
            } else {
              const message = `🎈 Hello ${contact.name}, wishing your ${member.relation} (${member.full_name}) a very Happy Birthday today! 🎂🎉 - Sent via CRM`;
              await whatsappService.sendMessage(contact.phone, message);
              birthdayWishesSent++;
            }

            await prisma.dashboardNotification.create({
              data: {
                type: 'birthday',
                contact_id: contact.id,
                message: `🎈 Birthday wish/reminder sent to ${contact.name} for ${member.relation} ${member.full_name}`
              }
            });
            notificationsCreated++;
          }
        }

        // Marriage Anniversary Check for Family Member
        if (member.marriage_anniversary) {
          const anniv = new Date(member.marriage_anniversary);
          if (anniv.getMonth() + 1 === todayMonth && anniv.getDate() === todayDate) {
            const message = `💐 Hello ${contact.name}, wishing your ${member.relation} (${member.full_name}) a very Happy Marriage Anniversary today! 🍾🥂 - Sent via CRM`;
            await whatsappService.sendMessage(contact.phone, message);
            anniversaryWishesSent++;

            await prisma.dashboardNotification.create({
              data: {
                type: 'anniversary',
                contact_id: contact.id,
                message: `💐 Marriage Anniversary wish sent to ${contact.name} for ${member.relation} ${member.full_name}`
              }
            });
            notificationsCreated++;
          }
        }

        // Death Anniversary / Remembrance Check
        if (member.date_of_death) {
          const dod = new Date(member.date_of_death);
          if (dod.getMonth() + 1 === todayMonth && dod.getDate() === todayDate) {
            const message = `🤍 Hello ${contact.name}, thinking of you today on the anniversary of your ${member.relation} ${member.full_name}'s passing. - Sent via CRM`;
            await whatsappService.sendMessage(contact.phone, message);
            remembranceSent++;

            await prisma.dashboardNotification.create({
              data: {
                type: 'death_anniversary',
                contact_id: contact.id,
                message: `🤍 Death anniversary remembrance sent to ${contact.name} for ${member.full_name}`
              }
            });
            notificationsCreated++;
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. Upcoming Rental Due Reminders
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
      const message = `🏠 Dear ${rental.client_name}, this is a friendly reminder that the rent of ₹${rental.rent_amount} for "${rental.property_name}" is due on ${dueDateStr}. Thank you! - Sent via CRM`;
      await whatsappService.sendMessage(rental.client_phone, message);
    }

    // -------------------------------------------------------------
    // 3. System Summary Report (Sent to Admin Owner)
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

    if (upcomingBills.length > 0 || pendingTasks.length > 0 || birthdayWishesSent > 0 || anniversaryWishesSent > 0) {
      let summary = `*📋 Daily CRM Automation Summary - ${today.toLocaleDateString('en-IN')}*\n\n`;
      
      if (birthdayWishesSent > 0) {
        summary += `🎂 *Birthday Wishes Sent:* ${birthdayWishesSent}\n`;
      }
      if (anniversaryWishesSent > 0) {
        summary += `💑 *Anniversary Wishes Sent:* ${anniversaryWishesSent}\n`;
      }
      if (remembranceSent > 0) {
        summary += `🤍 *Remembrance Messages Sent:* ${remembranceSent}\n`;
      }
      if (birthdayWishesSent > 0 || anniversaryWishesSent > 0 || remembranceSent > 0) {
        summary += `\n`;
      }

      if (upcomingBills.length > 0) {
        summary += `*Upcoming Bills (Next 3 Days):*\n`;
        upcomingBills.forEach(b => {
          summary += `- ${b.title}: ₹${b.amount} (Due: ${new Date(b.next_due_date).toLocaleDateString('en-IN')})\n`;
        });
        summary += `\n`;
      }
      
      if (pendingTasks.length > 0) {
        summary += `*Pending Tasks Due Today:*\n`;
        pendingTasks.forEach(t => {
          summary += `- ${t.title}${t.description ? ` (${t.description})` : ''}\n`;
        });
      }
      
      const status = whatsappService.getStatus();
      if (status.status === 'CONNECTED' && status.user?.number) {
        await whatsappService.sendMessage(status.user.number, summary);
      }
    }

    console.log(`✅ Daily Automation Job complete: ${birthdayWishesSent} Birthdays, ${anniversaryWishesSent} Anniversaries, ${remembranceSent} Remembrances.`);
    return {
      success: true,
      birthdayWishesSent,
      anniversaryWishesSent,
      remembranceSent,
      notificationsCreated
    };
  } catch (error: any) {
    console.error('Error executing WhatsApp automation job:', error);
    return { success: false, error: error.message };
  }
}

// Run nightly cron at midnight (0 0 * * *)
cron.schedule('0 0 * * *', async () => {
  await executeDailyWishesAndReminders();
});

console.log('Cron scheduler initialized.');
