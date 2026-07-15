import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { query } from '../../db/index.js';
import { itemService } from '../../services/ItemService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Equip a net from your inventory as your active catching tool.')
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
      opt.setName('net_id')
        .setDescription('The ID of the net you want to equip')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  category: 'economy',
  cooldown: 3000,

  async autocomplete(client, interaction) {
    try {
      const userId = interaction.user.id;
      const userItems = query('getUserItems').all(userId) || [];
      const nets = userItems.filter(ui => ui.category === 'net' && ui.count > 0);
      
      const choices = nets.map(ui => {
        const item = itemService.getItem(ui.item_id);
        const label = item ? `${item.emoji} ${item.name} (${ui.durability} uses remaining)` : ui.item_id;
        return { name: label, value: ui.item_id };
      });

      await interaction.respond(choices.slice(0, 25));
    } catch (err) {
      await interaction.respond([]);
    }
  },

  async execute(client, interaction, ctx) {
    const userId = interaction.user.id;
    const netId = interaction.options.getString('net_id');

    await ctx.sender.defer(interaction);

    const itemsService = ctx.container.resolve('items');
    const item = itemsService.getItem(netId);

    if (!item || item.category !== 'net') {
      return ctx.sender.error(interaction, 'That item is not a valid catching net.');
    }

    // Verify ownership
    const userItem = ctx.query('getUserItem').get(userId, netId);
    if (!userItem || userItem.count <= 0) {
      return ctx.sender.error(interaction, `You do not own a **${item.name}**! Buy one from the \`/shop\`.`);
    }

    // Equip the net
    ctx.transaction(() => {
      ctx.query('equipNet').run(netId, userId);
    });

    const embed = {
      color: COLORS.MINT,
      title: 'Net Equipped!',
      description: `Successfully equipped **${item.name}** ${item.emoji} as your active net!`,
      footer: { text: `Active tool updated · Ready to /catch` }
    };

    return ctx.sender.reply(interaction, embed);
  }
};
