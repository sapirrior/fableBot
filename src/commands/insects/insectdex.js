export default {
  name: 'insectdex',
  aliases: ['dex', 'bugs'],
  cooldown: 5000,
  description: 'Browse all insect species, their rarity, and sell values.',
  async execute(client, message, args, ctx) {
    const { RARITY_ORDER, RARITY_EMOJI, RARITY_COLORS } = ctx.constants;
    const { currencyName, prefix } = ctx.config;

    // Group insects by rarity
    const grouped = {};
    for (const insect of ctx.insets) {
      const r = insect.rarity;
      if (!grouped[r]) grouped[r] = [];
      grouped[r].push(insect);
    }

    // One embed field per rarity tier
    const fields = [];
    for (const tier of RARITY_ORDER) {
      if (!grouped[tier]) continue;
      const badge = RARITY_EMOJI[tier];
      const label = ctx.constants.capitalize(tier);
      const lines = grouped[tier].map(i => `${i.emoji} \`${i.id}\` **${i.value}f**`).join('\n');
      fields.push({ name: `${badge} ${label}`, value: lines, inline: true });
    }

    return ctx.sender.embed(message, {
      title: '📖 Fable Insectdex',
      color: RARITY_COLORS.rare,
      fields,
      footer: { text: `${ctx.insets.length} species total · ${prefix}catch to start hunting!` },
      timestamp: new Date().toISOString(),
    });
  }
};
