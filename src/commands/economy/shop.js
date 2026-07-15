import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  ApplicationIntegrationType, 
  InteractionContextType 
} from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse nets, baits, and other catching items available in the shop.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ]),
  category: 'economy',
  cooldown: 3000,

  async execute(client, interaction, ctx) {
    const itemsService = ctx.container.resolve('items');
    const shopItems = itemsService.getShopItems();
    const currency = ctx.config.currencyName || '⌬';

    if (!shopItems || shopItems.length === 0) {
      return ctx.sender.reply(interaction, {
        color: COLORS.BRAND,
        title: `The Shop is Empty`,
        description: `No items are currently stocked. Check back later!`
      });
    }

    // Group items by category
    const categories = {};
    for (const item of shopItems) {
      const cat = item.category || 'misc';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(item);
    }

    // Helper to format items list for a specific category
    const formatCategoryItems = (catName) => {
      const list = categories[catName] || [];
      if (!list.length) return 'No items available in this category.';
      
      return list.map(item => {
        const durabilityText = item.durability ? ` · Durability: **${item.durability} uses**` : '';
        return `${item.emoji} **${item.name}** (\`${item.id}\`)\n├─ Cost: **${currency} ${ctx.fmt(item.price)}**${durabilityText}\n└─ *${item.description}*`;
      }).join('\n\n');
    };

    // 1. Build Select Menu dropdown
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('shop_category_select')
      .setPlaceholder('🛒 Select an item category...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Nets')
          .setDescription('Purchase catching nets to increase rarity spawn rates.')
          .setEmoji('🥅')
          .setValue('net'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Baits & Lures')
          .setDescription('Use consumable baits for extra catch rolls or multipliers.')
          .setEmoji('🧪')
          .setValue('bait')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const dbUser = ctx.query('getUser').get(interaction.user.id);
    const balance = dbUser?.balance ?? 0;

    // Default landing embed
    const defaultEmbed = {
      color: COLORS.BRAND,
      title: `🛍️ Catcher's Supply Shop`,
      description: `Welcome! Use the dropdown menu below to select a supply category and view our catalog.\n\n-# Use \`/buy <item_id>\` to purchase items.`,
      footer: { text: `Your Balance: ${currency} ${ctx.fmt(balance)}` }
    };

    const response = await interaction.reply({
      embeds: [defaultEmbed],
      components: [row],
      withResponse: true
    });

    const responseMsg = response.resource?.message;
    if (!responseMsg?.createMessageComponentCollector) return;

    // Collect selection events
    const collector = responseMsg.createMessageComponentCollector({
      filter: (i) => i.customId === 'shop_category_select' && i.user.id === interaction.user.id,
      time: 60000 // 1 minute
    });

    collector.on('collect', async (menuInteraction) => {
      const selectedCategory = menuInteraction.values[0];
      const itemsList = formatCategoryItems(selectedCategory);
      const prettyName = selectedCategory === 'net' ? 'Nets' : 'Baits & Lures';

      const updatedEmbed = {
        color: COLORS.BRAND,
        title: `🛒 Shop — ${prettyName}`,
        description: `Use \`/buy <item_id>\` to purchase items.\n\n${itemsList}`,
        footer: { text: `Your Balance: ${currency} ${ctx.fmt(balance)}` }
      };

      await menuInteraction.update({
        embeds: [updatedEmbed],
        components: [row]
      });
    });

    collector.on('end', async (collected, reason) => {
      if (reason !== 'done') {
        const disabledRow = new ActionRowBuilder().addComponents(
          StringSelectMenuBuilder.from(selectMenu).setDisabled(true).setPlaceholder('Shop menu expired. Run /shop again.')
        );
        try {
          await interaction.editReply({
            components: [disabledRow]
          });
        } catch {}
      }
    });
  }
};
