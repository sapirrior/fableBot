import { SlashCommandBuilder } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  ownerOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder()
    .setName('ownerping')
    .setDescription('Owner: confirm the bot is alive and show uptime.'),

  /**
   * Hidden owner health-check command.
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} ctx
   */
  async execute(client, interaction, ctx) {
    const uptimeSec = Math.floor(process.uptime());
    const h = Math.floor(uptimeSec / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const s = uptimeSec % 60;
    return ctx.sender.reply(interaction, {
      color: COLORS.VOID,
      description: `Gateway: ${Math.round(client.ws.ping)} ms · Uptime: ${h}h ${m}m ${s}s`,
      footer: { text: 'owner only' },
    }, true);
  },
};
