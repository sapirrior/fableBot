import { logger } from '../util/logger.js';
import { container } from '../core/ServiceContainer.js';

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

    // Automatically register application slash commands on start
    import('../handlers/slashCommandHandler.js')
      .then(async ({ getSlashCommandsJSON }) => {
        try {
          logger.info('Registering slash commands dynamically to Discord API...', 'Client');
          const commandsData = getSlashCommandsJSON();
          await client.application.commands.set(commandsData);
          logger.info(`Successfully registered ${commandsData.length} slash commands dynamically.`, 'Client');
        } catch (err) {
          logger.error('Failed to register slash commands dynamically', err, 'Client');
        }
      })
      .catch(err => {
        logger.error('Failed to import slashCommandHandler during start registration', err, 'Client');
      });
  }
};

