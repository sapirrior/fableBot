import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("View a user's avatar image.")
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ])
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user whose avatar you want to view')
        .setRequired(false)
    ),
  cooldown: 3000,
  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const avatarUrl = targetUser.displayAvatarURL({ size: 1024, dynamic: true });

    return ctx.sender.reply(interaction, {
      title: `${targetUser.username}'s Avatar`,
      image: { url: avatarUrl }
    });
  }
};
