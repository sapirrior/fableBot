import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { shutdown } from '../../core/Shutdown.js';
import { COLORS } from '../../util/colors.js';

export default {
  ownerOnly: true,
  cooldown: 0,
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Owner: gracefully shut down the bot with no data loss.'),

  /**
   * Graceful stop command.
   * @param {import('discord.js').Client} client
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {object} ctx
   */
  async execute(client, interaction, ctx) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('confirm_stop')
        .setLabel('Proceed')
        .setStyle(ButtonStyle.Danger)
    );

    await ctx.sender.reply(interaction, {
      color: COLORS.ROSE,
      description: 'Are you sure you want to execute `/stop` and pause Fable?',
    });

    // Update with the Proceed button
    await interaction.editReply({
      components: [row]
    });

    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === interaction.user.id,
      time: 19000, // 19 second timeout as requested
    });

    collector.on('collect', async btnInt => {
      await btnInt.deferUpdate();
      collector.stop('confirmed');

      // Trigger grace shutdown with progress reporting to the user
      await shutdown(client, interaction);
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'confirmed') return;

      // Disable components on timeout
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_stop_expired')
          .setLabel('Proceed')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true)
      );

      try {
        await interaction.editReply({
          embeds: [{
            color: COLORS.SLATE,
            description: 'The shutdown request for `/stop` has expired.',
          }],
          components: [disabledRow],
        });
      } catch (_) {}
    });
  },
};
