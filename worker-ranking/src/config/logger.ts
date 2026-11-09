import { Logger } from '@volontariapp/logger';
import { configureLogger } from '@volontariapp/config';
import { config } from './runtime-config.js';

configureLogger(config.logger);
const logger = new Logger({
  context: 'WORKER-RANKING',
  format: config.logger.format,
});

export { logger };
