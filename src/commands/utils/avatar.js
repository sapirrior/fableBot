import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("View a user's avatar image.")
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
        .setDescription('The user whose avatar you want to view')
        .setRequired(false),
    ),
  cooldown: 3000,
  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    // dynamic:true was removed in discord.js v14 — omit it
    const avatarUrl = targetUser.displayAvatarURL({ size: 1024 });

    return ctx.sender.reply(interaction, {
      color: COLORS.SOFT,
      description: `**${targetUser.username}**`,
      image: { url: avatarUrl },
    });
  },
};

