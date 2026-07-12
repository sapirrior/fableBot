import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check your own or another user's coin balance.")
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
        .setDescription('The user whose balance you want to check')
        .setRequired(false)
    ),
  cooldown: 3000,
  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    // Ensure target user is upserted in the database
    ctx.query('upsertUser').run(targetUser.id);
    
    const dbUser = ctx.query('getUser').get(targetUser.id);
    const balance = dbUser?.balance ?? 0;
    const currencyEmoji = ctx.config.currencyName || '⌬';

    const cleanUsername = targetUser.username.replace(/[*_~`|]/g, '');

    if (targetUser.id === interaction.user.id) {
      return ctx.sender.reply(interaction, {
        description: `💵 **|** You have **${ctx.fmt(balance)} ${currencyEmoji}**`
      });
    } else {
      return ctx.sender.reply(interaction, {
        description: `💵 **|** **${cleanUsername}** has **${ctx.fmt(balance)} ${currencyEmoji}**`
      });
    }
  }
};
