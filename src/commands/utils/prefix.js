import { configManager } from '../../services/ConfigService.js';

const settingEmoji = '⚙️';

export default {
  name: 'prefix',
  aliases: [],
  cooldown: 3000,
  description: "Shows the bot's current prefix.",
  adminBypass: true,
  example: ['prefix'],
  async execute(client, message, args, ctx) {
    const currentPrefix = configManager.get('prefix');
    return ctx.sender.reply(message, settingEmoji, `, my current prefix is \`${currentPrefix}\``);
  }
};
