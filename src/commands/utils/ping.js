import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows the bot latency in milliseconds.')
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
  async execute(client, interaction, ctx) {
    const apiPing = Math.round(client.ws.ping);
    return ctx.sender.reply(interaction, {
      color: COLORS.SOFT,
      description: `Gateway latency: **${apiPing} ms**`,
    });
  },
};
