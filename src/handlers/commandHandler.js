import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

export const registry = new Map();

/**
 * Dynamically loads all command modules into the registry.
 */
export async function loadCommands() {
  const dirs = ['economy', 'insects', 'social', 'util'];
  const baseDir = resolve('./src/commands');

  for (const dir of dirs) {
    try {
      const files = await readdir(resolve(baseDir, dir));
      for (const file of files) {
        if (!file.endsWith('.js')) continue;

        const absolutePath = resolve(baseDir, dir, file);
        const fileUrl = pathToFileURL(absolutePath).href;
        
        const cmdModule = await import(fileUrl);
        const cmd = cmdModule.default;

        if (!cmd || !cmd.name) {
          console.warn(`[CommandHandler] Command in ${dir}/${file} is missing default export or name property.`);
          continue;
        }

        registry.set(cmd.name, cmd);
        if (cmd.aliases && Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            registry.set(alias, cmd);
          }
        }
      }
    } catch (err) {
      // Directory might not exist or be empty during early phase
      console.warn(`[CommandHandler] Directory ${dir} could not be read or loaded: ${err.message}`);
    }
  }

  console.log(`[CommandHandler] Successfully loaded ${registry.size} command mapping entries.`);
}
