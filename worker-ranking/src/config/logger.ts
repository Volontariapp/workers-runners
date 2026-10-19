import { Logger } from '@volontariapp/logger';
import { config } from './runtime-config.js';

Logger.setDefaultConfig({ format: config.logger.format });
const logger = new Logger({
  context: 'WORKER-RANKING',
  format: config.logger.format,
});

export { logger };
