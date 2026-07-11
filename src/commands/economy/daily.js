export default {
  name: 'daily',
  aliases: ['d'],
  cooldown: 2000,
  description: 'Claim your daily coin reward.',
  args: '',
  example: ['fab daily'],
  related: ['fab balance'],
  async execute(client, message, args, ctx) {
    const userId = message.author.id;
    const now = Date.now();
    const cooldownMs = ctx.config.dailyCooldownMs;
    const reward = ctx.config.dailyRewardCoins;

    // Fetch user info
    const row = ctx.query('getUser').get(userId);
    const lastDaily = row ? row.last_daily : 0;
    const timePassed = now - lastDaily;

    if (timePassed < cooldownMs) {
      const timeLeft = cooldownMs - timePassed;
      const hours = Math.floor(timeLeft / (3600 * 1000));
      const minutes = Math.floor((timeLeft % (3600 * 1000)) / (60 * 1000));
      return message.reply(`[⏳] **${message.author.username}** :: Node daily lock active!\n> Next claim available in **${hours}h ${minutes}m**.`);
    }

    // Award daily reward
    ctx.query('claimDaily').run(reward, now, userId);

    return message.reply(`[📆] **${message.author.username}** :: Daily reward claimed successfully!\n> Received: **${reward}** ${ctx.config.currencyName}`);
  }
};
