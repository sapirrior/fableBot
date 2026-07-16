import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { logger } from '../../util/logger.js';

export default {
  ownerOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Owner: Ban a user from executing specific commands or all commands.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .addStringOption(opt =>
      opt.setName('user_id')
        .setDescription('The Discord User ID to ban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('command')
        .setDescription('Specific command name to ban, or "all" to ban from everything')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason')
        .setDescription('The reason for this ban')
        .setRequired(false)
    ),
  category: 'owner',

  /**
   * Executes the ban command.
   * @param {import('discord.js').Client} client The Discord client instance.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction The command interaction.
   * @param {object} ctx The injected command context.
   * @returns {Promise<void>}
   */
  async execute(client, interaction, ctx) {
    const targetUserId = interaction.options.getString('user_id');
    const commandName = interaction.options.getString('command').toLowerCase().trim();
    const reason = interaction.options.getString('reason') || null;
    const ownerId = ctx.config.ownerId;

    if (targetUserId === ownerId) {
      return ctx.sender.error(interaction, 'You cannot ban the bot owner.');
    }

    try {
      // Execute the database write
      ctx.query('banUserCommand').run(targetUserId, commandName, reason);

      const scopeText = commandName === 'all' ? 'all commands' : `\`/${commandName}\``;
      const embed = {
        color: COLORS.MINT,
        title: 'User Banned Successfully',
        description: `Banned user **${targetUserId}** from using ${scopeText}.`,
        footer: {
          text: 'Fable Admin Panel'
        }
      };

      return ctx.sender.reply(interaction, embed);
    } catch (err) {
      logger.error(`Error executing ban for user ${targetUserId}`, err, 'BanCommand');
      return ctx.sender.error(interaction, 'Failed to write ban record to database.');
    }
  }
};
