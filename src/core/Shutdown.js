/**
 * Service managing graceful application shutdown and active context drains.
 */
import { closeDb } from '../db/index.js';
import { logger } from '../util/logger.js';
import { container } from './ServiceContainer.js';

let isShuttingDown = false;

/**
 * Returns the current shutting down status of the process.
 * @returns {boolean} True if shutting down, false otherwise.
 */
export function getShuttingDownStatus() {
  return isShuttingDown;
}

/**
 * Initiates the graceful shutdown sequence.
 * @param {Client} client
 */
export async function shutdown(client) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn('Shutdown signal received. Starting graceful cleanup...', 'Lifecycle');

  // 1. Command execution grace drain (250ms)
  await new Promise(resolve => setTimeout(resolve, 250));

  // 2. Stop spam sweeper
  try {
    const spamGuard = container.resolve('spamGuard');
    spamGuard.stopSpamSweeper();
  } catch (_) {}

  // 3. Stop backup scheduler
  try {
    const backup = container.resolve('backup');
    backup.stop();
  } catch (_) {}

  // 4. Flush debounced config writes to disk
  try {
    const configService = container.resolve('config');
    configService.flush();
  } catch (_) {}

  // 5. Destroy gateway connections and close DB
  if (client) {
    client.destroy();
  }
  closeDb();

  logger.info('Graceful shutdown completed successfully.', 'Lifecycle');
  process.exit(0);
}
