export default {
  name: 'leaderboard',
  aliases: ['lb', 'top', 'rank'],
  cooldown: 8000,
  description: 'View the top 10 Fable collectors by balance or collection size.',
  async execute(client, message, args, ctx) {
    const { currencyName, prefix } = ctx.config;
    const mode = (args[0] || '').toLowerCase();
    const isCollection = ['col', 'collection', 'insects', 'zoo'].includes(mode);

    const rows = isCollection
      ? ctx.query('getTopCollection').all(10)
      : ctx.query('getTopBalance').all(10);

    if (rows.length === 0) {
      return ctx.sender.error(message, ', the leaderboard is empty! Start playing first!');
    }

    // Resolve usernames
    const medals = ['🥇', '🥈', '🥉'];
    const lines = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let tag;
      try {
        const user = await client.users.fetch(row.user_id);
        tag = user.username;
      } catch {
        tag = `Unknown (${row.user_id.slice(-4)})`;
      }
      const rank = medals[i] ?? `**${i + 1}.**`;
      const value = isCollection
        ? `**${ctx.fmt(row.total)}** insects`
        : `**${ctx.fmt(row.balance)} ${currencyName}**`;
      lines.push(`${rank} ${tag}  —  ${value}`);
    }

    const title = isCollection
      ? '🏆 Fable Leaderboard — Top Collectors'
      : `🏆 Fable Leaderboard — Richest Players`;

    const footerHint = isCollection
      ? `${prefix}lb fables for Fables ranking`
      : `${prefix}lb collection for insect ranking`;

    return ctx.sender.embed(message, {
      title,
      color: ctx.constants.RARITY_COLORS.legendary,
      description: lines.join('\n'),
      footer: { text: footerHint },
      timestamp: new Date().toISOString(),
    });
  }
};
