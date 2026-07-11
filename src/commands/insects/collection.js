export default {
  name: 'collection',
  aliases: ['col', 'bag', 'zoo'],
  cooldown: 3000,
  description: 'View your insect collection, sorted by rarity.',
  async execute(client, message, args, ctx) {
    const target = ctx.parse.parseUser(message) ?? message.author;
    const rows = ctx.query('getCollection').all(target.id);

    if (rows.length === 0) {
      const tip = `Use \`${ctx.config.prefix}catch\` to start hunting!`;
      if (target.id === message.author.id) {
        return ctx.sender.error(message, `, your collection is empty!\n> ${tip}`);
      }
      return ctx.sender.error(message, `, **${target.username}** has no insects yet!\n> ${tip}`);
    }

    // Group by rarity order
    const grouped = {};
    for (const row of rows) {
      const spec = ctx.getInsect(row.insect_id);
      if (!spec) continue;
      const r = spec.rarity;
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push({ spec, count: row.count });
    }

    const { RARITY_ORDER, RARITY_EMOJI, RARITY_COLORS } = ctx.constants;
    const totalCount = rows.reduce((s, r) => s + r.count, 0);
    const uniqueCount = rows.length;

    // Build embed description grouped by tier
    let description = '';
    for (const tier of RARITY_ORDER) {
      if (!grouped[tier]) continue;
      const badge = RARITY_EMOJI[tier];
      const tierLabel = ctx.constants.capitalize(tier);
      description += `**${badge} ${tierLabel}**\n`;
      for (const { spec, count } of grouped[tier]) {
        description += `${spec.emoji} \`${spec.id}\` ×${count}\n`;
      }
      description += '\n';
    }

    return ctx.sender.embed(message, {
      author: {
        name: `🌿 ${target.username}'s Colony`,
        icon_url: target.displayAvatarURL({ size: 64 }),
      },
      color: RARITY_COLORS.rare,
      description: description.trim(),
      footer: { text: `${ctx.fmt(totalCount)} insects · ${uniqueCount}/20 unique species` },
      timestamp: new Date().toISOString(),
    });
  }
};
