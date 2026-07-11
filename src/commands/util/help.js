export default {
  name: 'help',
  aliases: ['h', 'commands', 'cmds'],
  cooldown: 3000,
  description: 'Displays the list of commands or info on a specific command.',
  async execute(client, message, args, ctx) {
    const { prefix } = ctx.config;
    const { registry } = await import('../../handlers/commandHandler.js');

    // --- Describe a specific command ---
    if (args.length > 0) {
      const commandName = args[0].toLowerCase();
      const cmd = registry.get(commandName);

      if (!cmd) {
        return ctx.sender.error(message, `, could not find that command :c`);
      }

      let title = `< ${prefix}${cmd.name} `;
      if (cmd.args) title += cmd.args + ' >';
      else title += '>';

      let aliasText = '';
      if (cmd.aliases && cmd.aliases.length > 0) {
        aliasText = `\n# Aliases\n${cmd.aliases.join(', ')}`;
      }

      const descText = `\n# Description\n${cmd.description ?? 'No description.'}`;

      let exampleText = '';
      if (cmd.example && cmd.example.length > 0) {
        exampleText = `\n# Example Command(s)\n${cmd.example.join(', ')}`;
      }

      let relatedText = '';
      if (cmd.related && cmd.related.length > 0) {
        relatedText = `\n# Related Command(s)\n${cmd.related.join(', ')}`;
      }

      const text = `\`\`\`md\n${title}\`\`\`\`\`\`md${aliasText}${descText}${exampleText}${relatedText}\`\`\`\n> Remove brackets when typing commands\n> [] = optional arguments\n> {} = optional user input`;
      return message.reply(text);
    }

    // --- Display all commands dynamically ---
    const uniqueCmds = Array.from(new Set(registry.values()));

    // Define category mappings and order
    const categoryMapping = {
      social: { name: '🎭 Social', order: 1 },
      economy: { name: '💰 Economy', order: 2 },
      insects: { name: '🌿 Insects', order: 3 },
      util: { name: '🔧 Utility', order: 4 }
    };

    // Group commands
    const grouped = {};
    for (const cmd of uniqueCmds) {
      const cat = cmd.category || 'util';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(`\`${cmd.name}\``);
    }

    // Build fields dynamically
    const fields = Object.keys(grouped)
      .map(cat => ({
        key: cat,
        name: categoryMapping[cat]?.name ?? `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: grouped[cat].join('  '),
        order: categoryMapping[cat]?.order ?? 99
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ name, value }) => ({ name, value, inline: false }));

    const embedData = {
      description: `Here is the list of commands!\n\nFor more info on a specific command, use \`${prefix} help {command}\``,
      color: ctx.constants.RARITY_COLORS.rare,
      author: {
        name: 'Command List',
        icon_url: message.author.displayAvatarURL({ size: 64 })
      },
      fields
    };

    return ctx.sender.embed(message, embedData);
  }
};
