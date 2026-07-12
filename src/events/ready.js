import { ActivityType } from 'discord.js';
import { logger } from '../util/logger.js';
import { configManager } from '../services/ConfigService.js';
import { container } from '../core/ServiceContainer.js';

function formatCount(num) {
  if (num >= 1_000_000_000_000) {
    return (num / 1_000_000_000_000).toFixed(1).replace(/\.0$/, '') + 't';
  }
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'b';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

export default {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.info(`Online and ready as ${client.user.tag}`, 'Client');

    const statusTemplate = configManager.get('statusMessage') || 'with ? butterflies';
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);
    const formatted = formatCount(totalUsers);
    const statusText = statusTemplate.replace('?', formatted);

    client.user.setActivity(statusText, {
      type: ActivityType.Streaming,
      url: 'https://www.twitch.tv/twitch'
    });

    logger.info(`Status set to: Streaming "${statusText}"`, 'Client');

    // Start the backup scheduler now that the client is fully connected
    const backup = container.resolve('backup');
    backup.start(client);

    // Sync bot application custom emojis on boot
    const emojis = container.resolve('emojis');
    emojis.syncEmojis(client).catch(() => {});
  }
};

