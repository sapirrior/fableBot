import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Display the rules for Fable bot!')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  cooldown: 10000,
  category: 'utils',

  /**
   * Executes the rules command, sending a formatted rules embed to the user.
   */
  async execute(client, interaction, ctx) {
    const rulesEmbed = {
      color: COLORS.SOFT,
      title: 'Failure to follow these rules will result in a ban and/or account reset!',
      description: 
        `•  Any actions performed to gain an unfair advantage over other users are explicitly against the rules. This includes but not limited to:\n` +
        `├> Using macros/scripts for any commands\n` +
        `└> Using multiple accounts for any reason\n\n` +
        `•  Do **not** use any exploits and report any found in the bot\n\n` +
        `•  You can **not** sell/trade bot currency or any bot goods for anything outside of the bot\n\n` +
        `[Privacy Policy](https://github.com/sapirrior/fableBot/blob/main/POLICY.md)   **-**   [Terms of Service](https://github.com/sapirrior/fableBot/blob/main/TERMS.md)`,
      author: {
        name: 'Fable Bot Rules',
        icon_url: client.user.displayAvatarURL({ size: 64 }),
      },
    };

    return ctx.sender.reply(interaction, rulesEmbed);
  },
};
