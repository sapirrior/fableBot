import { registry } from '../../handlers/commandHandler.js';

export default {
  name: 'help',
  aliases: ['h'],
  cooldown: 2000,
  description: 'List all commands or view details of a specific command.',
  async execute(client, message, args, ctx) {
    const prefix = ctx.config.prefix;

    if (args[0]) {
      const commandName = args[0].toLowerCase();
      const cmd = registry.get(commandName);
      if (!cmd) {
        return message.reply(`❌ Command \`${commandName}\` does not exist.`);
      }

      const embed = {
        color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
        title: `📖 Command: ${cmd.name}`,
        description: cmd.description || 'No description provided.',
        fields: [
          { name: 'Cooldown', value: `${(cmd.cooldown || 3000) / 1000}s`, inline: true },
          { name: 'Aliases', value: cmd.aliases ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'None', inline: true }
        ],
        footer: { text: `Usage: ${prefix}${cmd.name}` }
      };

      return message.reply({ embeds: [embed] });
    }

    // List all commands
    const uniqueCommands = new Set(registry.values());
    let commandList = '';
    for (const cmd of uniqueCommands) {
      commandList += `**${prefix}${cmd.name}** — _${cmd.description || 'No description'}_\n`;
    }

    const embed = {
      color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
      title: '🐞 Fable Bot Help Menu',
      description: `Use \`${prefix}help <command>\` for detailed description.\n\n${commandList}`,
      timestamp: new Date()
    };

    return message.reply({ embeds: [embed] });
  }
};
