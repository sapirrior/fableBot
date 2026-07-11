export default {
  name: 'help',
  aliases: ['h', 'commands', 'cmds'],
  cooldown: 3000,
  description: 'List all Fable commands, or get detailed info on a specific one.',
  async execute(client, message, args, ctx) {
    const { prefix } = ctx.config;

    // --- Specific command lookup ---
    if (args[0]) {
      const { registry } = await import('../../handlers/commandHandler.js');
      const cmd = registry.get(args[0].toLowerCase());
      if (!cmd) {
        return ctx.sender.error(message, `, unknown command \`${args[0]}\`!\n> Use \`${prefix}help\` to see all commands.`);
      }
      const aliases = cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'none';
      const cooldownSec = ((cmd.cooldown ?? 3000) / 1000).toFixed(0);
      return ctx.sender.embed(message, {
        author: { name: `📖 ${prefix}${cmd.name}` },
        color: ctx.constants.RARITY_COLORS.rare,
        description: cmd.description ?? 'No description.',
        fields: [
          { name: 'Aliases',   value: aliases,           inline: true },
          { name: 'Cooldown',  value: `${cooldownSec}s`, inline: true },
        ],
        footer: { text: `${prefix}help to view all commands` },
      });
    }

    // --- Full command list ---
    return ctx.sender.embed(message, {
      author: {
        name: '📖 Fable — Command Help',
        icon_url: client.user.displayAvatarURL({ size: 64 }),
      },
      color: ctx.constants.RARITY_COLORS.rare,
      description: `Use \`${prefix}help <command>\` for detailed info on any command.`,
      fields: [
        {
          name: '🌿 Colony',
          value: `\`catch\`  \`collection\`  \`release\`  \`insectdex\``,
          inline: false,
        },
        {
          name: '💵 Economy',
          value: `\`balance\`  \`daily\`  \`give\``,
          inline: false,
        },
        {
          name: '🏆 Social',
          value: `\`profile\`  \`leaderboard\``,
          inline: false,
        },
        {
          name: '🔧 Utility',
          value: `\`ping\`  \`help\``,
          inline: false,
        },
      ],
      footer: { text: `Prefix: ${prefix}  ·  ${prefix}help <command> for details` },
      timestamp: new Date().toISOString(),
    });
  }
};
