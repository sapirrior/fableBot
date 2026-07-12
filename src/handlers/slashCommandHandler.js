/**
 * Slash command handler — dynamic loader for src/slash-commands/.
 * Mirrors the pattern of commandHandler.js but uses SlashCommandBuilder data.
 */
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from '../util/logger.js';

/** @type {Map<string, object>} Map of commandName → command module */
export const slashRegistry = new Map();

/**
 * Dynamically loads all slash command modules into the slashRegistry.
 * @returns {Promise<void>}
 */
export async function loadSlashCommands() {
  const baseDir = resolve('./src/slash-commands');
  let dirs = [];

  try {
    const contents = await readdir(baseDir, { withFileTypes: true });
    dirs = contents.filter(d => d.isDirectory()).map(d => d.name);
  } catch (err) {
    logger.error('Failed to read slash-commands directory', err, 'SlashHandler');
    return;
  }

  for (const dir of dirs) {
    try {
      const files = await readdir(resolve(baseDir, dir));
      for (const file of files.filter(f => f.endsWith('.js'))) {
        const url = pathToFileURL(resolve(baseDir, dir, file)).href;
        const mod = await import(url);
        const cmd = mod.default;

        if (!cmd?.data?.name || typeof cmd.execute !== 'function') {
          logger.warn(`Slash command ${dir}/${file} is missing data.name or execute().`, 'SlashHandler');
          continue;
        }

        cmd.category = dir;

        if (slashRegistry.has(cmd.data.name)) {
          logger.warn(`Duplicate slash command registered: "${cmd.data.name}" from ${dir}/${file}`, 'SlashHandler');
        }

        slashRegistry.set(cmd.data.name, cmd);
      }
    } catch (err) {
      logger.warn(`Could not load slash-commands/${dir}: ${err.message}`, 'SlashHandler');
    }
  }

  logger.info(`Loaded ${slashRegistry.size} slash command(s) into registry.`, 'SlashHandler');
}

/**
 * Returns all slash commands as JSON-serializable data for API registration.
 * @returns {object[]}
 */
export function getSlashCommandsJSON() {
  return Array.from(slashRegistry.values()).map(cmd => cmd.data.toJSON());
}
