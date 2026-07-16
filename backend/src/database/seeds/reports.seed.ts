import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { ReportDefinitionsRepository } from '../../modules/reporting/report-definitions.repository';
import { DEFAULT_REPORT_DEFINITIONS } from '../../modules/reporting/templates/default-report-templates';

/**
 * Idempotent reporting seeder. The default reports are SYSTEM, code-owned
 * templates: a missing key is inserted, and an existing system row is refreshed
 * to the latest code (so theme/template upgrades land on `npm run seed:reports`).
 * User-created rows (isSystem=false) are never touched.
 *
 * Run with: npm run seed:reports
 */
async function seedReports(): Promise<void> {
  const logger = new Logger('ReportsSeed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  try {
    const repo = app.get(ReportDefinitionsRepository);
    for (const def of DEFAULT_REPORT_DEFINITIONS) {
      const existing = await repo.findByKey(def.key);
      if (existing) {
        if (!existing.isSystem) {
          logger.log(
            `Report "${def.key}" overridden by a custom row — skipping`,
          );
          continue;
        }
        // Refresh the code-owned system template in place.
        existing.name = def.name;
        existing.description = def.description;
        existing.dataSource = def.dataSource;
        existing.recipe = def.recipe;
        existing.engine = 'handlebars';
        existing.content = def.content;
        await repo.save(existing);
        logger.log(`Refreshed report "${def.key}"`);
        continue;
      }
      await repo.save(
        repo.create({
          key: def.key,
          name: def.name,
          description: def.description,
          dataSource: def.dataSource,
          recipe: def.recipe,
          engine: 'handlebars',
          content: def.content,
          helpers: null,
          isActive: true,
          isSystem: true,
        }),
      );
      logger.log(`Seeded report "${def.key}"`);
    }
  } finally {
    await app.close();
  }
}

seedReports().catch((error) => {
  console.error('Reports seed failed:', error);
  process.exit(1);
});
