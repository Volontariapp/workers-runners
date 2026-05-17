import { NestFactory } from '@nestjs/core';
import { Logger } from '@volontariapp/logger';
import { AppModule } from './app.module';

const logger = new Logger({ context: 'Bootstrap' });

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  logger.info('Application context created');

  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, starting graceful shutdown...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  logger.info('Workers runner started');
}

bootstrap().catch((error) => {
  logger.fatal('Bootstrap failed', { error });
  process.exit(1);
});
