import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription("View your owned nets, baits, and catching equipment.")
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user whose inventory you want to view')
        .setRequired(false)
    ),
  category: 'economy',
  cooldown: 3000,

  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    if (targetUser.bot) {
      return ctx.sender.error(interaction, 'Bots do not have inventories.');
    }

    await ctx.sender.defer(interaction);

    const itemsService = ctx.container.resolve('items');
    const userItems = ctx.query('getUserItems').all(targetUser.id) || [];
    const isSelf = targetUser.id === interaction.user.id;

    if (userItems.length === 0) {
      const description = isSelf 
        ? `Your inventory is empty! Use \`/shop\` to buy nets and baits.`
        : `**${targetUser.username}** does not own any items.`;
      
      return ctx.sender.reply(interaction, {
        color: COLORS.BRAND,
        title: `${targetUser.username}'s Inventory`,
        description,
        thumbnail: { url: targetUser.displayAvatarURL({ size: 256 }) },
        footer: { text: 'Use /shop to browse supplies' }
      });
    }

    // Group items by category
    const grouped = {};
    for (const ui of userItems) {
      if (ui.count <= 0) continue;
      const item = itemsService.getItem(ui.item_id);
      if (!item) continue;

      const cat = item.category || 'misc';
      if (!grouped[cat]) grouped[cat] = [];
      
      grouped[cat].push({
        name: item.name,
        emoji: item.emoji || '📦',
        count: ui.count,
        durability: ui.durability,
        equipped: ui.equipped === 1
      });
    }

    // Find active net
    const activeNetEntry = userItems.find(ui => ui.equipped === 1 && ui.category === 'net');
    let activeNetText = '*None equipped. Use `/equip` to equip a net.*';
    if (activeNetEntry) {
      const activeNetDetails = itemsService.getItem(activeNetEntry.item_id);
      if (activeNetDetails) {
        const durText = activeNetEntry.durability !== null ? `**${activeNetEntry.durability} uses**` : 'Infinite';
        activeNetText = `${activeNetDetails.emoji} **${activeNetDetails.name}** (${durText} remaining)`;
      }
    }

    const fields = [];
    const categoriesOrder = ['net', 'bait'];

    for (const cat of categoriesOrder) {
      const list = grouped[cat];
      if (!list || list.length === 0) continue;

      const lines = list.map(item => {
        if (cat === 'net') {
          const durabilityText = item.durability !== null ? `**${item.durability} uses**` : 'Infinite';
          const statusText = item.equipped ? '**Equipped** 🥇' : 'Unequipped';
          return `${item.emoji} **${item.name}** (×**${item.count}**)\n├─ Durability: ${durabilityText}\n└─ Status: ${statusText}`;
        } else {
          return `${item.emoji} **${item.name}** (×**${item.count}**)\n└─ Lure type consumable`;
        }
      });

      const prettyCategoryName = cat === 'net' ? 'Nets' : 'Baits & Lures';

      fields.push({
        name: prettyCategoryName,
        value: lines.join('\n\n'),
        inline: false
      });
    }

    if (fields.length === 0) {
      return ctx.sender.reply(interaction, {
        color: COLORS.BRAND,
        title: `${targetUser.username}'s Inventory`,
        description: isSelf ? 'Your inventory is empty.' : `${targetUser.username}'s inventory is empty.`,
        thumbnail: { url: targetUser.displayAvatarURL({ size: 256 }) }
      });
    }

    const embed = {
      color: COLORS.BRAND,
      author: {
        name: `${targetUser.username}'s Inventory`
      },
      thumbnail: {
        url: targetUser.displayAvatarURL({ size: 256 })
      },
      description: `🎒 **Active Net**: ${activeNetText}\n\nUse \`/equip <net_id>\` to switch active nets.`,
      fields,
      footer: {
        text: isSelf ? 'Use /shop to browse and purchase catching supplies' : 'Catcher Supply Bag'
      }
    };

    return ctx.sender.reply(interaction, embed);
  }
};
