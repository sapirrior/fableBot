/**
 * Message Create event handler.
 * Decoupled, thin orchestrator routing incoming command requests.
 */
import { registry } from '../handlers/commandHandler.js';
import { checkCooldown } from '../util/cooldown.js';
import { query } from '../db/index.js';
import { logger } from '../util/logger.js';
import { configManager } from '../services/ConfigService.js';
import { buildContext } from '../runtime/CommandContext.js';
import { applyMentionSafeReply } from '../runtime/MentionSafeReply.js';
import { getShuttingDownStatus } from '../core/Shutdown.js';
import * as ban from '../util/ban.js';
import * as sender from '../util/sender.js';

export default {
  name: 'messageCreate',
  once: false,
  async execute(client, message) {
    // 1. Ignore bots, webhooks, Direct Messages, or execution if shutting down
    if (message.author.bot || !message.guild || getShuttingDownStatus()) return;

    const content = message.content.trim();
    const prefix = configManager.get('prefix') || 'ah';
    const mentionPrefix = `<@${client.user.id}>`;
    const mentionNickPrefix = `<@!${client.user.id}>`;

    let commandText = '';
    const lowerContent = content.toLowerCase();
    const lowerPrefix = prefix.toLowerCase();

    // 2. Resolve prefix or bot mention trigger
    if (lowerContent.startsWith(lowerPrefix)) {
      commandText = content.slice(prefix.length).trim();
    } else if (content.startsWith(mentionPrefix)) {
      commandText = content.slice(mentionPrefix.length).trim();
    } else if (content.startsWith(mentionNickPrefix)) {
      commandText = content.slice(mentionNickPrefix.length).trim();
    } else {
      return;
    }

    if (!commandText) return;

    // 3. Parse command name and args
    const args = commandText.split(/ +/g);
    const commandName = args.shift().toLowerCase();

    // 4. Look up command (Return early before allocating context or parsing configs - D1 Fix)
    const cmd = registry.get(commandName);
    if (!cmd) return;

    // 5. Apply reply wrappers (Pings suppression - D9 Fix)
    applyMentionSafeReply(message);

    // 6. Build Context lazily via Factory (D2 Fix)
    const ctx = buildContext();

    // 7. Check bans, disables, and global spam
    const isAllowed = await ban.check(ctx, message, cmd);
    if (!isAllowed) return;

    // 8. Ensure user exists in database
    try {
      query('upsertUser').run(message.author.id);
    } catch (e) {
      logger.error(`Failed to upsert user ${message.author.id}`, e, 'MessageCreate');
      return;
    }

    // 9. Cooldown check
    const cooldownMs = cmd.cooldown ?? 3000;
    const cooldownLeft = checkCooldown(message.author.id, cmd.name, cooldownMs);
    if (cooldownLeft > 0) {
      const waitSec = (cooldownLeft / 1000).toFixed(1);
      message.reply(`⏳ **| ${message.author.username}**, slow down! Wait **${waitSec}s** for \`${cmd.name}\`.`)
        .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000))
        .catch(() => {});
      return;
    }

    // 10. Execute command with structured error recovery
    try {
      await cmd.execute(client, message, args, ctx);
    } catch (err) {
      logger.error(`Error running command: ${cmd.name}`, err, 'Command');
      sender.error(message, ', something went wrong! Please try again.');
    }
  }
};
