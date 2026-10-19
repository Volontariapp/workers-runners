import { loadConfig } from '@volontariapp/config';
import { CustomConfig } from './custom-config.js';
import { resolveConfigDirectory } from './resolve-config-directory.js';

/** Configuration chargee une seule fois : elle sert aussi aux decorateurs @Processor (concurrence). */
export const config = loadConfig(resolveConfigDirectory(), CustomConfig);
