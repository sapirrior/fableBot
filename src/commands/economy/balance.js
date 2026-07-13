import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check your own or another user's coin balance.")
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
        .setDescription('The user whose balance you want to check')
        .setRequired(false),
    ),
  cooldown: 3000,
  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    ctx.query('upsertUser').run(targetUser.id);

    const dbUser   = ctx.query('getUser').get(targetUser.id);
    const balance  = dbUser?.balance ?? 0;
    const currency = ctx.config.currencyName || '⌬';
    const isSelf   = targetUser.id === interaction.user.id;

    const description = isSelf
      ? `Your balance is **${currency} ${ctx.fmt(balance)}**.`
      : `**${targetUser.username}** has **${currency} ${ctx.fmt(balance)}**.`;

    const embed = isSelf
      ? {
          color: COLORS.BRAND,
          description,
          footer: { text: 'Use /daily to claim your next reward' },
        }
      : {
          color: COLORS.BRAND,
          description,
        };

    return ctx.sender.reply(interaction, embed);
  },
};
