import prisma from './prisma';
import bcrypt from 'bcryptjs';

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
  } catch (error) {
    console.error('⚠️ Warning: Auto-seeding admin user failed:', error);
  }
}

if (require.main === module) {
  ensureAdminUserExists();
}
