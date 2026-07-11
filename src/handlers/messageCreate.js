import { readFileSync } from 'fs';
import { resolve } from 'path';
import { registry } from './commandHandler.js';
import { checkCooldown } from '../util/cooldown.js';
import { query } from '../db/index.js';

// Read config files
const config = JSON.parse(readFileSync(resolve('./src/configs/config.json'), 'utf8'));
const insets = JSON.parse(readFileSync(resolve('./src/configs/insets.json'), 'utf8'));

export function onMessageCreate(client, message) {
  // Ignore bots and webhooks
  if (message.author.bot) return;

  const content = message.content;
  const prefix = config.prefix;

  // Check prefix
  if (!content.startsWith(prefix)) return;

  // Parse command name and args
  const args = content.slice(prefix.length).trim().split(/ +/g);
  const commandName = args.shift().toLowerCase();

  // Look up command
  const cmd = registry.get(commandName);
  if (!cmd) return;

  // Ensure user exists in database (upsertUser)
  try {
    query('upsertUser').run(message.author.id);
  } catch (dbError) {
    console.error(`[DatabaseSync] Failed to upsert user ${message.author.id}:`, dbError);
    return;
  }

  // Cooldown check (default to 3000ms if not defined)
  const cooldownMs = cmd.cooldown ?? 3000;
  const cooldownLeft = checkCooldown(message.author.id, cmd.name, cooldownMs);
  if (cooldownLeft > 0) {
    message.reply(`⏳ You are using this command too fast! Please wait **${(cooldownLeft / 1000).toFixed(1)}s**.`);
    return;
  }

  // Context bundle
  const ctx = {
    config,
    insets,
    query
  };

  // Execute command safely
  cmd.execute(client, message, args, ctx).catch((err) => {
    console.error(`[CommandHandler] Error executing command "${cmd.name}":`, err);
    message.reply('❌ An error occurred while executing that command.');
  });
}
