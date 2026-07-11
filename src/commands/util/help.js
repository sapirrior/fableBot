import { registry } from '../../handlers/commandHandler.js';

export default {
  name: 'help',
  aliases: ['h'],
  cooldown: 2000,
  description: 'This displays the commands or more info on a specific command',
  args: '[command]',
  example: ['fab help catch', 'fab help'],
  related: [],
  async execute(client, message, args, ctx) {
    const prefix = ctx.config.prefix;

    if (args[0]) {
      const commandName = args[0].toLowerCase();
      const cmd = registry.get(commandName);
      if (!cmd) {
        return message.reply('**🚫 |** Could not find that command :c');
      }

      let title = `< ${prefix} ${cmd.name} `;
      if (cmd.args) title += cmd.args + ' >';
      else title += '>';

      let aliasSection = '';
      if (cmd.aliases && cmd.aliases.length > 0) {
        aliasSection = `\n# Aliases\n${cmd.aliases.join(' , ')}`;
      }

      const descSection = `\n# Description\n${cmd.description || 'No description'}`;

      let exampleSection = '';
      if (cmd.example && cmd.example.length > 0) {
        exampleSection = `\n# Example Command(s)\n${cmd.example.join(' , ')}`;
      }

      let relatedSection = '';
      if (cmd.related && cmd.related.length > 0) {
        relatedSection = `\n# Related Command(s)\n${cmd.related.join(' , ')}`;
      }

      const text = `\`\`\`md\n${title}\`\`\`\`\`\`md${aliasSection}${descSection}${exampleSection}${relatedSection}\`\`\`\`\`\`md\n> Remove brackets when typing commands\n> [] = optional arguments\n> {} = optional user input\`\`\``;

      return message.reply(text);
    }

    // General command list display matching OwO category style
    const embed = {
      description: `Here is the list of commands! The prefix is \`${prefix}\`\nFor more info on a specific command, use \`${prefix}help {command}\``,
      color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
      author: { name: 'Fable Command List', icon_url: message.author.displayAvatarURL() },
      fields: [
        {
          name: '💰 Economy',
          value: '`balance`  `daily`  `give`'
        },
        {
          name: '🌱 Insects',
          value: '`catch`  `collection`  `insectdex`  `sell`  `release`'
        },
        {
          name: '🎭 Social',
          value: '`profile`  `leaderboard`'
        },
        {
          name: '🔧 Utility',
          value: '`ping`  `help`'
        }
      ]
    };

    return message.reply({ embeds: [embed] });
  }
};
