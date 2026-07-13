import { logger } from '../util/logger.js';
import { container } from '../core/ServiceContainer.js';
import { configManager } from '../services/ConfigService.js';

export default {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.info(`Online and ready as ${client.user.tag}`, 'Client');

    // Start the backup scheduler now that the client is fully connected
    const backup = container.resolve('backup');
    backup.start(client);

    // Sync bot application custom emojis on boot
    const emojis = container.resolve('emojis');
    emojis.syncEmojis(client).catch(() => {});

    // Automatically register public slash commands globally on start
    import('../handlers/slashCommandHandler.js')
      .then(async ({ getSlashCommandsJSON, getOwnerCommandsJSON }) => {
        try {
          logger.info('Registering slash commands dynamically to Discord API...', 'Client');
          const commandsData = getSlashCommandsJSON();
          await client.application.commands.set(commandsData);
          logger.info(`Successfully registered ${commandsData.length} slash commands globally.`, 'Client');
        } catch (err) {
          logger.error('Failed to register slash commands dynamically', err, 'Client');
        }

        // Register owner-only commands to the private owner guild
        const ownerGuildId = configManager.get('ownerGuildId');
        if (!ownerGuildId) {
          logger.warn('ownerGuildId not set in config.json — skipping owner command registration.', 'Client');
          return;
        }
        try {
          const ownerData = getOwnerCommandsJSON();
          const guild = await client.guilds.fetch(ownerGuildId);
          await guild.commands.set(ownerData);
          logger.info(`Registered ${ownerData.length} owner command(s) to guild ${ownerGuildId}.`, 'Client');
        } catch (err) {
          logger.error('Failed to register owner guild commands', err, 'Client');
        }
      })
      .catch(err => {
        logger.error('Failed to import slashCommandHandler during start registration', err, 'Client');
      });
  }
};

