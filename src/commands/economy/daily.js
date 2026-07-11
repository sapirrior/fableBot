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
      return message.reply(`📆 You have already claimed your daily reward today! Next claim available in **${hours}h ${minutes}m**.`);
    }

    // Award daily reward
    ctx.query('claimDaily').run(reward, now, userId);

    return message.reply(`📆 **|** You claimed your daily reward and received **${ctx.config.currencyIcon} ${reward}** ${ctx.config.currencyName}!`);
  }
};
