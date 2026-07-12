import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coin reward.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ]),
  cooldown: 5000,
  async execute(client, interaction, ctx) {
    const userId = interaction.user.id;
    const now = Date.now();

    const dbUser = ctx.query('getUser').get(userId);
    const lastDaily = dbUser?.last_daily ?? 0;
    
    const dailyCooldownMs = ctx.config.dailyCooldownMs || 79200000; // 22 hours default
    const timePassed = now - lastDaily;

    if (timePassed < dailyCooldownMs) {
      const timeLeft = dailyCooldownMs - timePassed;
      return ctx.sender.error(
        interaction, 
        `You already claimed your daily reward! Wait **${ctx.parse.formatTimeLeft(timeLeft)}**.`
      );
    }

    const rewardCoins = ctx.config.dailyRewardCoins || 250;
    const currencyEmoji = ctx.config.currencyName || '⌬';

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

    return ctx.sender.reply(interaction, {
      description: `📆 **|** You claimed your daily reward of **${ctx.fmt(rewardCoins)} ${currencyEmoji}**! Streak: **${streak}**`
    });
  }
};
