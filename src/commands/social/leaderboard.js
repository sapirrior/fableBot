export default {
  name: 'leaderboard',
  aliases: ['lb', 'top'],
  cooldown: 5000,
  description: 'View the leaderboard for coins or collection size.',
  async execute(client, message, args, ctx) {
    const type = (args[0] || 'coins').toLowerCase();

    if (type === 'collection' || type === 'insects' || type === 'col') {
      // Top collections
      const rows = ctx.query('getTopCollection').all(10);
      if (rows.length === 0) {
        return message.reply('🪹 The collection leaderboard is empty.');
      }

      let description = '';
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let userTag = row.user_id;
        try {
          const user = await client.users.fetch(row.user_id);
          userTag = user.username;
        } catch {
          userTag = `Unknown User (${row.user_id})`;
        }
        description += `${i + 1}. **${userTag}** — **${row.total}** insects\n`;
      }

      const embed = {
        color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
        title: '🏆 Fable Leaderboard - Top Collectors',
        description,
        timestamp: new Date()
      };
      return message.reply({ embeds: [embed] });
    } else {
      // Top balances (default)
      const rows = ctx.query('getTopBalance').all(10);
      if (rows.length === 0) {
        return message.reply('🪹 The coins leaderboard is empty.');
      }

      let description = '';
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        let userTag = row.user_id;
        try {
          const user = await client.users.fetch(row.user_id);
          userTag = user.username;
        } catch {
          userTag = `Unknown User (${row.user_id})`;
        }
        description += `${i + 1}. **${userTag}** — **💰 ${row.balance}** coins\n`;
      }

      const embed = {
        color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
        title: '🏆 Fable Leaderboard - Richest Users',
        description,
        timestamp: new Date()
      };
      return message.reply({ embeds: [embed] });
    }
  }
};
