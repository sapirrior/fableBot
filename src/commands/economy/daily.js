export default {
  name: 'daily',
  aliases: ['d'],
  cooldown: 5000,
  description: 'Claim your daily coin reward.',
  example: ['daily'],
  async execute(client, message, args, ctx) {
    const userId = message.author.id;
    const now = Date.now();

    const dbUser = ctx.query('getUser').get(userId);
    const lastDaily = dbUser?.last_daily ?? 0;
    
    const dailyCooldownMs = ctx.config.dailyCooldownMs || 79200000; // 22 hours default
    const timePassed = now - lastDaily;

    if (timePassed < dailyCooldownMs) {
      const timeLeft = dailyCooldownMs - timePassed;
      return ctx.sender.error(
        message, 
        `, you already claimed your daily reward! Wait **${ctx.parse.formatTimeLeft(timeLeft)}**.`
      );
    }

    const rewardCoins = ctx.config.dailyRewardCoins || 250;
    const currencyEmoji = ctx.emoji('logo') || ctx.config.currencyName || '⌬';

    // Calculate streak (reset if more than 48 hours passed)
    let streak = dbUser?.daily_streak ?? 0;
    if (timePassed < 172800000) { // 48 hours
      streak += 1;
    } else {
      streak = 1;
    }

    // Apply reward
    ctx.transaction(() => {
      ctx.query('claimDaily').run(rewardCoins, now, streak, userId);
    });

    return ctx.sender.reply(
      message, 
      '📆', 
      `, you claimed your daily reward of **${ctx.fmt(rewardCoins)} ${currencyEmoji}**! Streak: **${streak}**`
    );
  }
};
