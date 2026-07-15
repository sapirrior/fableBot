import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { itemService } from '../../services/ItemService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Purchase a net or bait from the shop.')
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
      opt.setName('item_id')
        .setDescription('The ID of the item you wish to purchase')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  category: 'economy',
  cooldown: 3000,

  async autocomplete(client, interaction) {
    try {
      const shopItems = itemService.getShopItems() || [];
      const choices = shopItems.map(item => {
        return { name: `${item.emoji} ${item.name} (${item.price} ⌬)`, value: item.id };
      });
      await interaction.respond(choices.slice(0, 25));
    } catch (err) {
      await interaction.respond([]);
    }
  },

  /**
   * Executes the /buy command.
   */
  async execute(client, interaction, ctx) {
    const userId = interaction.user.id;
    const itemId = interaction.options.getString('item_id');

    await ctx.sender.defer(interaction);

    const itemsService = ctx.container.resolve('items');
    const item = itemsService.getItem(itemId);

    if (!item) {
      return ctx.sender.error(interaction, `That item does not exist in the shop! Use \`/shop\` to see available stock.`);
    }

    const dbUser = ctx.query('getUser').get(userId);
    const balance = dbUser?.balance ?? 0;

    if (balance < item.price) {
      return ctx.sender.error(interaction, `You don't have enough coins! **${item.name}** costs **${item.price} ⌬**.`);
    }

    // Process transaction
    const result = ctx.transaction(() => {
      // Deduct coins
      ctx.query('updateUserBalance').run(-item.price, userId);

      // Add to inventory
      // upsertUserItem params: user_id, item_id, category, count, durability, updateCount, updateDurability
      ctx.query('upsertUserItem').run(
        userId,
        item.id,
        item.category,
        1,
        item.durability,
        1,
        item.durability
      );

      // Auto-equip net if category is 'net' and user has no net equipped
      const activeNet = ctx.query('getUserNet').get(userId);
      let autoEquipped = false;
      if (!activeNet && item.category === 'net') {
        ctx.query('equipNet').run(item.id, userId);
        autoEquipped = true;
      }

      const updatedUser = ctx.query('getUser').get(userId);
      return {
        newBalance: updatedUser.balance,
        autoEquipped
      };
    });

    const currency = ctx.config.currencyName || '⌬';
    let message = `You purchased **${item.name}** ${item.emoji} for **${item.price} ⌬**!`;
    if (item.category === 'net') {
      if (result.autoEquipped) {
        message += `\nIt has been automatically equipped as your active net because you didn't have one equipped.`;
      } else {
        message += `\nUse \`/equip ${item.id}\` to equip this net when you are ready to use it!`;
      }
    }

    const embed = {
      color: COLORS.MINT,
      title: `Purchase Successful!`,
      description: message,
      footer: { text: `Balance: ${currency} ${ctx.fmt(result.newBalance)}` }
    };

    return ctx.sender.reply(interaction, embed);
  }
};
