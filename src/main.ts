import { NestFactory } from '@nestjs/core';
import { Logger } from '@volontariapp/logger';
import { AppModule } from './app.module.js';

const logger = new Logger({ context: 'Bootstrap' });

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  app.enableShutdownHooks();

  logger.info('Application context created');

  logger.info('Workers runner started');
}

bootstrap().catch((error) => {
  logger.fatal('Bootstrap failed', { error });
  process.exit(1);
});
