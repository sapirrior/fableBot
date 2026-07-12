import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../util/logger.js';

export const registry = new Map();

/**
 * Dynamically loads all command modules into the registry.
 */
export async function loadCommands() {
  const baseDir = resolve('./src/commands');
  let dirs = [];
  try {
    const contents = await readdir(baseDir, { withFileTypes: true });
    dirs = contents.filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
  } catch (err) {
    logger.error('Failed to read commands directory', err, 'CommandHandler');
    return;
  }

  for (const dir of dirs) {
    try {
      const files = await readdir(resolve(baseDir, dir));
      for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const absolutePath = resolve(baseDir, dir, file);
        const fileUrl = pathToFileURL(absolutePath).href;
        
        const cmdModule = await import(fileUrl);
        const cmd = cmdModule.default;

        if (!cmd || !cmd.name || typeof cmd.execute !== 'function') {
          logger.warn(`Command in ${dir}/${file} is missing 'name' or 'execute' function.`, 'CommandHandler');
          continue;
        }

        cmd.category = dir;
        const nameLower = cmd.name.toLowerCase();
        if (registry.has(nameLower)) {
          logger.warn(`Duplicate command name registered: "${nameLower}" from ${dir}/${file}`, 'CommandHandler');
        }
        registry.set(nameLower, cmd);
        
        if (cmd.aliases && Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            const aliasLower = alias.toLowerCase();
            if (registry.has(aliasLower)) {
              logger.warn(`Duplicate command alias registered: "${aliasLower}" for command "${cmd.name}"`, 'CommandHandler');
            }
            registry.set(aliasLower, cmd);
          }
        }
      }
    } catch (err) {
      // Directory might not exist or be empty during early phase
      logger.warn(`Directory ${dir} could not be read or loaded: ${err.message}`, 'CommandHandler');
    }
  }

  logger.info(`Successfully loaded ${registry.size} command mapping entries.`, 'CommandHandler');
}
