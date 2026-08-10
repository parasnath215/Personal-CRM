import prisma from './prisma';
import bcrypt from 'bcryptjs';

export const DEFAULT_INCOME_CATEGORIES = [
  'Hotel income',
  'Ashram rent',
  'Ashram donation',
  'Transport nagar Building rents',
  'Office salary',
  'Trading business',
  'Consultancy',
  'Other',
];

export const DEFAULT_EXPENDITURE_CATEGORIES = [
  'Home grocery & Gifts',
  'Clothes',
  'Tours &Transport @ car maintenance',
  'Building maintenance',
  'Electric bill',
  'House tax',
  'Water & Sewerage tax',
  'Map sanction related',
  'Staff salary',
  'Trading business related',
  'Wifi broadband',
  'All types Subscription fees',
  'Gas bill',
  'School and Tution fees',
  'Personal & Business training fees',
  'Books and stationary',
  'Business related purchase items',
  'Luxury purchase',
  'Entertainment',
  'Medical related',
  'Any types consulting fees',
  'Donation',
];

export async function ensureDefaultCategoriesExist() {
  try {
    for (const name of DEFAULT_INCOME_CATEGORIES) {
      await prisma.transactionCategory.upsert({
        where: { name_type: { name, type: 'income' } },
        update: {},
        create: { name, type: 'income', is_custom: false }
      });
    }
    for (const name of DEFAULT_EXPENDITURE_CATEGORIES) {
      await prisma.transactionCategory.upsert({
        where: { name_type: { name, type: 'expenditure' } },
        update: {},
        create: { name, type: 'expenditure', is_custom: false }
      });
    }
    console.log('✅ Auto-seeded default transaction categories');
  } catch (error) {
    console.error('⚠️ Warning: Auto-seeding transaction categories failed:', error);
  }
}

export async function ensureAdminUserExists() {
  try {
    const adminEmail = 'admin@crm.com';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Admin User',
          role: 'admin',
        }
      });
      console.log('✅ Auto-seeded default admin user: admin@crm.com / admin123');
    } else {
      console.log('ℹ️ Admin user exists: admin@crm.com');
    }

    await ensureDefaultCategoriesExist();
  } catch (error) {
    console.error('⚠️ Warning: Auto-seeding admin user failed:', error);
  }
}

if (require.main === module) {
  ensureAdminUserExists();
}

