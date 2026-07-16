/**
 * interactionCreate event handler.
 * Routes all slash command interactions and autocomplete interactions.
 */
import { slashRegistry } from '../handlers/slashCommandHandler.js';
import { checkCooldown } from '../util/cooldown.js';
import { query } from '../db/index.js';
import { logger } from '../util/logger.js';
import { buildContext } from '../runtime/CommandContext.js';
import { getShuttingDownStatus, incrementActiveCommands, decrementActiveCommands } from '../core/Shutdown.js';
import { isOwner } from '../util/ownerGuard.js';
import * as sender from '../util/sender.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(client, interaction) {
    // 1. Route autocomplete interactions
    if (interaction.isAutocomplete()) {
      const cmd = slashRegistry.get(interaction.commandName);
      if (!cmd || typeof cmd.autocomplete !== 'function') return;
      try {
        await cmd.autocomplete(client, interaction);
      } catch (err) {
        logger.error(`Autocomplete error in /${interaction.commandName}:`, err, 'Interaction');
      }
      return;
    }

    // 2. We only care about chat input (slash) commands
    if (!interaction.isChatInputCommand()) return;

    // 3. Prevent execution during shutdowns
    if (getShuttingDownStatus()) {
      return sender.error(interaction, 'The bot is currently shutting down. Please try again later.');
    }

    // 4. Resolve the slash command from registry
    const cmd = slashRegistry.get(interaction.commandName);
    if (!cmd) {
      return sender.error(interaction, 'This command was not found or is no longer registered.');
    }

    const userId = interaction.user.id;

    // 5. Block non-owners from owner-only commands
    if (cmd.ownerOnly && !isOwner(userId)) {
      return sender.error(interaction, 'This command is restricted to the bot owner.');
    }

    // 5.5 Check if the user is banned
    try {
      const ban = query('checkUserBan').get(userId, cmd.data.name);
      if (ban) {
        const reason = ban.reason ? `Reason: *${ban.reason}*` : 'No reason provided.';
        const scopeText = ban.command === 'all' ? 'all commands' : `\`/${cmd.data.name}\``;
        return sender.error(interaction, `You have been banned from using ${scopeText}.\n\n💬 ${reason}`);
      }
    } catch (err) {
      logger.error(`Failed to check user ban status for ${userId}`, err, 'Interaction');
      return sender.error(interaction, 'Failed to verify user account status.');
    }

    // 6. Ensure the user row exists in the database
    try {
      query('upsertUser').run(userId);
    } catch (err) {
      logger.error(`Failed to upsert user ${userId}`, err, 'Interaction');
      return sender.error(interaction, 'Failed to resolve user account metadata.');
    }

    // 7. User command cooldown checks
    const cooldownMs = cmd.cooldown ?? 3000;
    const cooldownLeft = checkCooldown(userId, cmd.data.name, cooldownMs);
    if (cooldownLeft > 0) {
      const waitSec = (cooldownLeft / 1000).toFixed(1);
      return sender.error(interaction, `Slow down! Please wait **${waitSec}s** before using \`/${cmd.data.name}\` again.`);
    }

    // 7. Inject execution context
    const ctx = buildContext();

    // 8. Execute command with error safety wrapper
    const isDbCommand = cmd.category === 'economy' || cmd.category === 'gambling' || cmd.category === 'insects';
    if (isDbCommand) incrementActiveCommands();
    try {
      await cmd.execute(client, interaction, ctx);
    } catch (err) {
      logger.error(`Error executing slash command: /${cmd.data.name}`, err, 'Interaction');
      await sender.error(interaction, 'An error occurred while executing this command.');
    } finally {
      if (isDbCommand) decrementActiveCommands();
    }
  }
};
