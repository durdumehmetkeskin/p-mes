import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SystemRole } from '../../modules/roles/enums/system-role.enum';
import { UsersService } from '../../modules/users/users.service';

/**
 * Idempotent admin seeder. Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME
 * from the environment and ensures an admin user exists:
 *   - creates the user (as admin) if the email is unused;
 *   - promotes an existing user to admin if needed;
 *   - does nothing if the user is already an admin.
 *
 * Run with: npm run seed:admin
 */
async function seedAdmin(): Promise<void> {
  const logger = new Logger('AdminSeed');

  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const name = process.env.ADMIN_NAME ?? 'Administrator';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error('ADMIN_PASSWORD must be set to seed an admin user');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const users = app.get(UsersService);
    const existing = await users.findByEmail(email);

    if (!existing) {
      const created = await users.create({ email, name, password });
      await users.setRoles(created.id, [SystemRole.Admin]);
      logger.log(`Created admin user ${email}`);
      return;
    }

    const roleNames = existing.roles.map((r) => r.name);
    if (roleNames.includes(SystemRole.Admin)) {
      logger.log(`User ${email} is already an admin — nothing to do`);
      return;
    }

    await users.setRoles(existing.id, [
      ...new Set([...roleNames, SystemRole.Admin]),
    ]);
    logger.log(`Promoted existing user ${email} to admin`);
  } finally {
    await app.close();
  }
}

seedAdmin().catch((error) => {
  console.error('Admin seed failed:', error);
  process.exit(1);
});
