import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Display the bot rules, terms of service, and privacy guidelines.')
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

  /**
   * Executes the rules command, sending a structured rules embed to the user.
   * @param {import('discord.js').Client} client The Discord client instance.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction The command interaction.
   * @param {object} ctx The injected command context.
   * @returns {Promise<void>}
   */
  async execute(client, interaction, ctx) {
    const rulesEmbed = {
      color: COLORS.SOFT,
      author: {
        name: 'Fable Bot Rules',
        icon_url: client.user.displayAvatarURL({ size: 64 }),
      },
      description: 
        `• **Unfair Advantage**: Any actions performed to gain an unfair advantage are explicitly against the rules. This includes using macros, scripts, or automations for commands, as well as abusing multiple accounts.\n\n` +
        `• **Exploits**: Do not exploit any bugs or economy loopholes. Please report any issues you find to the development team.\n\n` +
        `• **Real-Money Trading (RMT)**: You cannot sell, buy, or trade bot currency or items for real money or goods outside of the bot.\n\n` +
        `• **Respect & Fair Play**: Treat other users with respect when interacting with the bot.\n\n` +
        `-# By using Fable, you acknowledge and agree to follow these guidelines. Violations may result in an economy reset or a permanent bot ban.`,
    };

    return ctx.sender.reply(interaction, rulesEmbed);
  },
};
