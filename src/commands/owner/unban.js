import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { logger } from '../../util/logger.js';

export default {
  ownerOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Owner: Lift a ban on a user for specific commands or all commands.')
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
        .setDescription('The Discord User ID to unban')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('command')
        .setDescription('Specific command name to unban, or "all" to lift a global ban')
        .setRequired(true)
    ),
  category: 'owner',

  /**
   * Executes the unban command.
   * @param {import('discord.js').Client} client The Discord client instance.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction The command interaction.
   * @param {object} ctx The injected command context.
   * @returns {Promise<void>}
   */
  async execute(client, interaction, ctx) {
    const targetUserId = interaction.options.getString('user_id');
    const commandName = interaction.options.getString('command').toLowerCase().trim();

    try {
      // Execute the database write
      ctx.query('liftUserCommandBan').run(targetUserId, commandName);

      const scopeText = commandName === 'all' ? 'all commands' : `\`/${commandName}\``;
      const embed = {
        color: COLORS.MINT,
        title: 'User Unbanned Successfully',
        description: `Unbanned user **${targetUserId}** from using ${scopeText}.`,
        footer: {
          text: 'Fable Admin Panel'
        }
      };

      return ctx.sender.reply(interaction, embed);
    } catch (err) {
      logger.error(`Error executing unban for user ${targetUserId}`, err, 'UnbanCommand');
      return ctx.sender.error(interaction, 'Failed to remove ban record from database.');
    }
  }
};
