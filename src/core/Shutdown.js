import { closeDb, checkpoint } from '../db/index.js';
import { logger } from '../util/logger.js';
import { container } from './ServiceContainer.js';
import { COLORS } from '../util/colors.js';

let isShuttingDown = false;
let activeCommands = 0;

/**
 * Returns the current shutting down status of the process.
 * @returns {boolean} True if shutting down, false otherwise.
 */
export function getShuttingDownStatus() {
  return isShuttingDown;
}

export function incrementActiveCommands() {
  activeCommands++;
}

export function decrementActiveCommands() {
  activeCommands = Math.max(0, activeCommands - 1);
}

export function getActiveCommandsCount() {
  return activeCommands;
}

/**
 * Initiates the graceful shutdown sequence.
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').ChatInputCommandInteraction} [interaction]
 */
export async function shutdown(client, interaction = null) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn('Shutdown signal received. Starting graceful cleanup...', 'Lifecycle');

  const updateStatus = async (text) => {
    if (interaction) {
      try {
        await interaction.editReply({
          embeds: [{
            color: COLORS.CRIMSON,
            description: text,
          }],
          components: [],
        });
      } catch (_) {}
    }
  };

  // 1. Drain commands & wait for active database-based commands to complete
  let inFlight = activeCommands;
  let waitSecs = 0;
  const maxWait = 60; // Wait up to 60 seconds maximum

  while (inFlight > 0 && waitSecs < maxWait) {
    await updateStatus(`⏳ **Shutdown in progress:** waiting for **${inFlight}** active game/command(s) to finish (${waitSecs}/${maxWait}s)...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    waitSecs += 2;
    inFlight = activeCommands;
  }

  await updateStatus('⏳ **Shutdown in progress:** draining active commands...');
  await new Promise(resolve => setTimeout(resolve, 500));

  await updateStatus('⏳ **Shutdown in progress:** merging database logs (WAL checkpoint)...');
  checkpoint();

  await updateStatus('⏳ **Shutdown in progress:** flushing configurations...');
  try {
    const configService = container.resolve('config');
    configService.flush();
  } catch (_) {}

  await updateStatus('⏳ **Shutdown in progress:** executing final database backup...');
  try {
    const backup = container.resolve('backup');
    await backup.runBackup(client);
    backup.stop();
  } catch (_) {}

  await updateStatus('✅ **Fable is now offline.**');

  if (client) {
    client.destroy();
  }
  closeDb();

  logger.info('Graceful shutdown completed successfully.', 'Lifecycle');
  process.exit(0);
}
