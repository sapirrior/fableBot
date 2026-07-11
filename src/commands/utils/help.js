export default {
  name: 'help',
  aliases: ['h', 'commands', 'cmds'],
  cooldown: 3000,
  description: 'Displays the list of commands.',
  example: ['help'],
  async execute(client, message, args, ctx) {
    const { prefix } = ctx.config;
    const { registry } = await import('../../handlers/commandHandler.js');

    // --- Display all commands dynamically ---
    const uniqueCmds = Array.from(new Set(registry.values()));

    // Define category mappings and order
    const categoryMapping = {
      social: { name: '🎭 Social', order: 1 },
      economy: { name: '💰 Economy', order: 2 },
      insects: { name: '🌿 Insects', order: 3 },
      utils: { name: '🔧 Utility', order: 4 }
    };

    // Group commands
    const grouped = {};
    for (const cmd of uniqueCmds) {
      const cat = cmd.category || 'utils';
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
      description: `Here is the list of commands!\n\nFor more info on a specific command, use \`${prefix} cmd {command}\``,
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
