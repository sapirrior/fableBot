import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../util/logger.js';

/**
 * Dynamically loads and registers all events from src/events directory.
 * @param {Client} client - The Discord.js Client instance
 */
export async function loadEvents(client) {
  const eventsDir = resolve('./src/events');

  try {
    const files = await readdir(eventsDir);
    let loadedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.js')) continue;

      const absolutePath = resolve(eventsDir, file);
      const fileUrl = pathToFileURL(absolutePath).href;

      const eventModule = await import(fileUrl);
      const eventObj = eventModule.default;

      if (!eventObj || !eventObj.name || typeof eventObj.execute !== 'function') {
        logger.warn(`Event file ${file} is missing default export, name, or execute function.`, 'EventHandler');
        continue;
      }

      if (eventObj.once) {
        client.once(eventObj.name, (...args) => eventObj.execute(client, ...args));
      } else {
        client.on(eventObj.name, (...args) => eventObj.execute(client, ...args));
      }

      loadedCount++;
      logger.debug(`Loaded event: ${eventObj.name}`, 'EventHandler');
    }

    logger.info(`Successfully registered ${loadedCount} events.`, 'EventHandler');
  } catch (err) {
    logger.error('Failed to dynamically load events:', err, 'EventHandler');
  }
}
