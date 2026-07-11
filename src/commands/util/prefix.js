import { logger } from '../../util/logger.js';
import { configManager } from '../../services/ConfigService.js';

const regex = /^[\x00-\x7F]{1,25}$/i;
const mentions = /<(?:@[!&]?|#)\d+>/g;
const settingEmoji = '⚙️';
const comments = [
  'I like it!',
  'Fancy!',
  'nice.',
  ';)',
  'I love it <3',
  "It's perfect!",
  'amazing.',
  'wow',
  'Wonderful',
  '10/10',
  '🎉',
];

export default {
  name: 'prefix',
  aliases: [],
  cooldown: 10000,
  description: 'Change the prefix for the server! Only server admins can use this command.',
  async execute(client, message, args, ctx) {
    const username = message.author.username;

    // Display current prefix
    if (!args.length) {
      const currentPrefix = configManager.get('prefix');
      return ctx.sender.reply(message, settingEmoji, `, the current prefix is set to **\`${currentPrefix}\`**!`);
    }

    // Must have Manage Guild or Manage Channels permissions
    if (!message.member.permissions.has('ManageGuild') && !message.member.permissions.has('ManageChannels')) {
      return ctx.sender.error(message, ", you're not an admin! >:c");
    }

    // Parse and validate prefix
    const newPrefix = args.join('').toLowerCase();
    if (!regex.test(newPrefix)) {
      return ctx.sender.error(message, ', invalid prefix! Custom prefix must be under 25 characters and exclude special characters');
    } else if (mentions.test(newPrefix)) {
      return ctx.sender.error(message, ', invalid prefix! Custom prefix must exclude mentions');
    }

    // Save prefix dynamically (auto-saved asynchronously by configManager)
    configManager.set('prefix', newPrefix);
    ctx.config.prefix = newPrefix; // keep current execution context prefix updated

    const comment = comments[Math.floor(Math.random() * comments.length)];
    return ctx.sender.reply(
      message,
      settingEmoji,
      `, you successfully changed my server prefix to **\`${newPrefix}\`**! ${comment}`
    );
  }
};
