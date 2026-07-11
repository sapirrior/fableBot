import { readFileSync } from 'fs';
import { resolve } from 'path';
import { registry } from './commandHandler.js';
import { checkCooldown } from '../util/cooldown.js';
import { query } from '../db/index.js';

// Read config files
const config = JSON.parse(readFileSync(resolve('./src/configs/config.json'), 'utf8'));
const insets = JSON.parse(readFileSync(resolve('./src/configs/insets.json'), 'utf8'));

export function onMessageCreate(client, message) {
  // Ignore bots, webhooks, and Direct Messages
  if (message.author.bot || !message.guild) return;

  console.log(`[Message] Received content from ${message.author.username}: "${message.content}"`);

  // Globally disable mention ping on message replies
  const originalReply = message.reply.bind(message);
  message.reply = function (options) {
    if (typeof options === 'string') {
      return originalReply({ content: options, allowedMentions: { repliedUser: false } });
    } else if (typeof options === 'object' && options !== null) {
      options.allowedMentions = { ...options.allowedMentions, repliedUser: false };
      return originalReply(options);
    }
    return originalReply(options);
  };

  const content = message.content.trim();
  const prefix = config.prefix;
  const mentionPrefix = `<@${client.user.id}>`;
  const mentionNickPrefix = `<@!${client.user.id}>`;

  let commandText = '';

  const lowerContent = content.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  console.log(`[Debug] Checking content triggers. content: "${content}", lowerPrefix: "${lowerPrefix}", mentionPrefix: "${mentionPrefix}", mentionNickPrefix: "${mentionNickPrefix}"`);

  // Resolve prefix / triggers (require prefix or direct bot mention)
  if (lowerContent.startsWith(lowerPrefix)) {
    commandText = content.slice(prefix.length).trim();
  } else if (content.startsWith(mentionPrefix)) {
    commandText = content.slice(mentionPrefix.length).trim();
  } else if (content.startsWith(mentionNickPrefix)) {
    commandText = content.slice(mentionNickPrefix.length).trim();
  } else {
    return; // Not a command
  }

  if (!commandText) return;

  // Parse command name and args
  const args = commandText.split(/ +/g);
  const commandName = args.shift().toLowerCase();

  console.log(`[Debug] Resolved commandText: "${commandText}", commandName: "${commandName}"`);

  // Look up command
  const cmd = registry.get(commandName);
  if (!cmd) {
    console.log(`[Debug] Command not found in registry: "${commandName}"`);
    return;
  }

  console.log(`[Debug] Found command "${cmd.name}". Executing...`);

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
    message.reply(`[⏳] **${message.author.username}** :: System throttle active!\n> Please wait **${(cooldownLeft / 1000).toFixed(1)}s** before querying this node again.`);
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
