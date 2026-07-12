import { CATEGORY_META } from '../../configs/categories.js';

export default {
  name: 'help',
  aliases: ['h', 'commands', 'cmds'],
  cooldown: 3000,
  adminBypass: true,
  description: 'Displays the list of commands.',
  example: ['help'],
  async execute(client, message, args, ctx) {
    const { prefix } = ctx.config;
    const { registry } = ctx;

    // --- Display all commands dynamically ---
    const uniqueCmds = Array.from(new Set(registry.values()));

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
        name: CATEGORY_META[cat]?.name ?? `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: grouped[cat].join('  '),
        order: CATEGORY_META[cat]?.order ?? 99
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ name, value }) => ({ name, value, inline: false }));

    const embedData = {
      description: `Here is the list of commands!\n\nFor more info on a specific command,\n\nuse \`${prefix} cmd {command}\``,
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
