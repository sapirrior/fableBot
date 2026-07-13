import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coin reward.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  cooldown: 5000,
  async execute(client, interaction, ctx) {
    const userId   = interaction.user.id;
    const now      = Date.now();
    const dbUser   = ctx.query('getUser').get(userId);
    const lastDaily       = dbUser?.last_daily ?? 0;
    const dailyCooldownMs = ctx.config.dailyCooldownMs || 86400000;
    const timePassed      = now - lastDaily;

    if (timePassed < dailyCooldownMs) {
      const timeLeft = dailyCooldownMs - timePassed;
      return ctx.sender.error(
        interaction,
        `Your next daily reward is available in **${ctx.parse.formatTimeLeft(timeLeft)}**.`,
      );
    }

    // Defer before transaction — safe to defer after early-return errors above
    await ctx.sender.defer(interaction);

    const rewardCoins = ctx.config.dailyRewardCoins || 250;
    const currency    = ctx.config.currencyName || '⌬';

    // Streak: reset if more than 48 h since last claim
    let streak = dbUser?.daily_streak ?? 0;
    streak = timePassed < 172_800_000 ? streak + 1 : 1;

    ctx.transaction(() => ctx.query('claimDaily').run(rewardCoins, now, streak, userId));

    const newBalance = (dbUser?.balance ?? 0) + rewardCoins;
    const streakNote = streak > 1 ? `  ·  Streak: ${streak} days` : '';

    return ctx.sender.reply(interaction, {
      color: COLORS.MINT,
      description: `Daily reward claimed. **+${currency} ${ctx.fmt(rewardCoins)}** added to your balance.`,
      footer: { text: `Balance: ${currency} ${ctx.fmt(newBalance)}${streakNote}  ·  Next claim in 24h` },
    });
  },
};
