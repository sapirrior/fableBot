import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription("Check your own or another user's catcher profile.")
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user whose profile you want to check')
        .setRequired(false)
    ),
  cooldown: 5000,
  category: 'economy',

  /**
   * Executes the profile command to render the catcher profile.
   * @param {import('discord.js').Client} client The Discord client instance.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction The command interaction.
   * @param {object} ctx The injected command context.
   * @returns {Promise<void>}
   */
  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    if (targetUser.bot) {
      return ctx.sender.error(interaction, 'Bots do not have catcher profiles.');
    }
    await ctx.sender.defer(interaction);
    ctx.query('upsertUser').run(targetUser.id);

    const dbUser = ctx.query('getUser').get(targetUser.id);
    const balance = dbUser?.balance ?? 0;
    const xp = dbUser?.xp ?? 0;
    const dailyStreak = dbUser?.daily_streak ?? 0;
    const currency = ctx.config.currencyName || '⌬';

    const insectService = ctx.container.resolve('insects');
    const levelMeta = insectService.computeLevel(xp);

    const isSelf = targetUser.id === interaction.user.id;

    // Formatting according to visual guidelines (no markdown in author/footer, values in bold)
    const fields = [
      {
        name: 'Coin Balance',
        value: `**${currency} ${ctx.fmt(balance)}**`,
        inline: true
      },
      {
        name: 'Catcher Rank',
        value: `Level **${levelMeta.level}** · ${levelMeta.emoji} **${levelMeta.title}**`,
        inline: true
      },
      {
        name: 'Experience Progress',
        value: `**${ctx.fmt(levelMeta.currentXp)}** / **${ctx.fmt(levelMeta.nextLevelXp)} XP**`,
        inline: true
      },
      {
        name: 'Daily Streak',
        value: `**${dailyStreak} day(s)**`,
        inline: true
      }
    ];

    const embed = {
      color: COLORS.BRAND,
      author: {
        name: isSelf ? `${targetUser.username}'s Profile` : `${targetUser.username}'s Profile`
      },
      thumbnail: {
        url: targetUser.displayAvatarURL({ size: 256 })
      },
      fields,
      footer: {
        text: isSelf ? 'Use /daily to build your streak!' : `Fable Profile Card`
      }
    };

    return ctx.sender.reply(interaction, embed);
  }
};
