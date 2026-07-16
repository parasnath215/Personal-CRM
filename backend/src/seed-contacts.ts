import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dummyContact = await prisma.contact.upsert({
    where: { phone: '+1234567890' },
    update: {},
    create: {
      name: 'John Doe',
      phone: '+1234567890',
      email: 'john.doe@example.com',
      tags: 'VIP, Friend',
      familyMembers: {
        create: [
          {
            relation: 'spouse',
            full_name: 'Jane Doe',
            date_of_birth: new Date('1990-05-15'),
          },
          {
            relation: 'father',
            full_name: 'Richard Doe',
            date_of_death: new Date('2015-08-20'),
          }
        ]
      }
    }
  });

  console.log('Dummy contact seeded:', dummyContact);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
