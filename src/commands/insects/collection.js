import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

// Rarity metadata matching Fable styles
const RARITY_LABELS = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  celestial: 'Celestial'
};

export default {
  data: new SlashCommandBuilder()
    .setName('collection')
    .setDescription("View your own or another player's insect collection.")
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
        .setDescription('The user whose collection you want to view')
        .setRequired(false)
    ),
  category: 'insects',
  cooldown: 3000,

  async execute(client, interaction, ctx) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    if (targetUser.bot) {
      return ctx.sender.error(interaction, 'Bots do not have insect collections.');
    }
    ctx.query('upsertUser').run(targetUser.id);

    await ctx.sender.defer(interaction);

    const insectService = ctx.container.resolve('insects');
    const dbCollection = ctx.query('getCollection').all(targetUser.id);
    const dbUser = ctx.query('getUser').get(targetUser.id);

    const levelMeta = insectService.computeLevel(dbUser?.xp ?? 0);
    const isSelf = targetUser.id === interaction.user.id;

    if (!dbCollection || dbCollection.length === 0) {
      const description = isSelf 
        ? `Your collection is empty! Use \`/catch\` to find some insects.`
        : `**${targetUser.username}** hasn't caught any insects yet.`;
      
      return ctx.sender.reply(interaction, {
        color: COLORS.BRAND,
        author: {
          name: `${targetUser.username}'s Collection`,
          icon_url: targetUser.displayAvatarURL({ size: 64 })
        },
        description,
        footer: { text: `Level ${levelMeta.level} · ${levelMeta.emoji} ${levelMeta.title}` }
      });
    }

    // Group items by rank/tier
    const grouped = {};
    let totalInsects = 0;

    for (const entry of dbCollection) {
      const insect = insectService.getById(entry.insect_id);
      if (!insect) continue;

      totalInsects += entry.count;
      const tier = insect.rarity || 'common';
      if (!grouped[tier]) grouped[tier] = [];

      // Calculate star rank based on duplicate count
      const starCount = entry.count <= 1 ? 0 : Math.min(5, Math.floor(Math.log2(entry.count)));
      const stars = '★'.repeat(starCount) + '☆'.repeat(5 - starCount);

      const sellValue = insectService.computeSellValue(insect, entry.count);

      grouped[tier].push({
        name: insect.name,
        count: entry.count,
        stars,
        sellValue
      });
    }

    const fields = [];
    const orderedTiers = ['celestial', 'legendary', 'epic', 'rare', 'uncommon', 'common'];

    for (const tier of orderedTiers) {
      const list = grouped[tier];
      if (!list || list.length === 0) continue;

      const lines = list.map(item => {
        return `**${item.name}** (×**${item.count}**)\n└─ \`${item.stars}\` · Value: **${item.sellValue} ⌬** each`;
      });

      fields.push({
        name: RARITY_LABELS[tier] || tier.toUpperCase(),
        value: lines.join('\n'),
        inline: false
      });
    }

    const embed = {
      color: COLORS.BRAND,
      author: {
        name: `${targetUser.username}'s Insect Collection`,
        icon_url: targetUser.displayAvatarURL({ size: 64 })
      },
      fields,
      footer: {
        text: `Level ${levelMeta.level} · ${levelMeta.emoji} ${levelMeta.title} · Total: ${totalInsects} insects`
      }
    };

    return ctx.sender.reply(interaction, embed);
  }
};
