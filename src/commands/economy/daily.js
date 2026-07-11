export default {
  name: 'daily',
  aliases: ['d'],
  cooldown: 2000,
  description: 'Claim your daily Fables reward. Build a streak for bonus coins!',
  async execute(client, message, args, ctx) {
    const userId = message.author.id;
    const now = Date.now();
    const { dailyCooldownMs, dailyRewardCoins, currencyName } = ctx.config;

    const row = ctx.query('getUser').get(userId);
    const lastDaily = row?.last_daily ?? 0;
    const currentStreak = row?.daily_streak ?? 0;

    const timeSinceLast = now - lastDaily;

    // Cooldown check
    if (timeSinceLast < dailyCooldownMs) {
      const timeLeft = dailyCooldownMs - timeSinceLast;
      return ctx.sender.error(message, `, you already claimed your daily!\n> ⏱ Next in: **${ctx.parse.formatTimeLeft(timeLeft)}**`);
    }

    // Streak logic: keep streak if they claimed within cooldown + 24h window (< 46h ago)
    const streakBreakMs = dailyCooldownMs + 24 * 60 * 60 * 1000;
    const keepStreak = lastDaily > 0 && timeSinceLast < streakBreakMs;
    const newStreak = keepStreak ? currentStreak + 1 : 1;

    // Streak bonus: +5 per streak day, capped at +100
    const streakBonus = Math.min((newStreak - 1) * 5, 100);
    const totalReward = dailyRewardCoins + streakBonus;

    // Persist
    ctx.query('claimDaily').run(totalReward, now, newStreak, userId);

    let text = `, daily claimed!\n> 🪙 **+${ctx.fmt(totalReward)} ${currencyName}**`;
    if (newStreak > 1) text += `  ·  Streak: **${newStreak} days** 🔥`;
    if (streakBonus > 0) text += `\n> ✨ Streak bonus: **+${streakBonus} ${currencyName}**`;

    const nextMs = dailyCooldownMs;
    text += `\n> ⏱ Next in: **${ctx.parse.formatTimeLeft(nextMs)}**`;

    return ctx.sender.reply(message, '💰', text);
  }
};
