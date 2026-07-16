import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { logger } from '../../util/logger.js';
import { query } from '../../db/index.js';
import { itemService } from '../../services/ItemService.js';

// Rarity mapping for styling and XP
const RARITY_MAP = {
  common: { color: COLORS.SLATE, xp: 10, label: 'Common' },
  uncommon: { color: COLORS.MINT, xp: 30, label: 'Uncommon' },
  rare: { color: COLORS.SOFT, xp: 75, label: 'Rare' },
  epic: { color: COLORS.GOLD, xp: 200, label: 'Epic' },
  legendary: { color: COLORS.BRAND, xp: 600, label: 'Legendary' },
  celestial: { color: COLORS.VOID, xp: 1500, label: 'Celestial' }
};

export default {
  data: new SlashCommandBuilder()
    .setName('catch')
    .setDescription('Catch an insect for your collection.')
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
      opt.setName('bait')
        .setDescription('Optional bait to use for this catch')
        .setRequired(false)
        .setAutocomplete(true)
    ),
  category: 'insects',
  cooldown: 15000,

  async autocomplete(client, interaction) {
    const userId = interaction.user.id;
    try {
      const userItems = query('getUserItems').all(userId) || [];
      const choices = userItems
        .filter(ui => ui.category === 'bait' && ui.count > 0)
        .map(ui => {
          const item = itemService.getItem(ui.item_id);
          return item ? { name: `${item.emoji} ${item.name} (x${ui.count})`, value: item.id } : null;
        })
        .filter(Boolean);

      await interaction.respond(choices.slice(0, 25));
    } catch (err) {
      logger.error('Error in catch autocomplete', err, 'CatchCommand');
      await interaction.respond([]);
    }
  },

  /**
   * Executes the /catch command.
   */
  async execute(client, interaction, ctx) {
    const userId = interaction.user.id;
    const dbUser = ctx.query('getUser').get(userId);
    const balance = dbUser?.balance ?? 0;
    const catchCost = 10;

    if (balance < catchCost) {
      return ctx.sender.error(interaction, `You don't have enough coins! A catch costs **10 ⌬**.`);
    }

    // Defer early before database writes/significant logic
    await ctx.sender.defer(interaction);

    const itemsService = ctx.container.resolve('items');
    const insectService = ctx.container.resolve('insects');

    let rollOpts = {
      multipliers: {},
      extraCatches: 0
    };

    // 1. Check equipped Net
    const equippedNet = ctx.query('getUserNet').get(userId);
    let netItem = null;
    if (equippedNet && equippedNet.durability > 0) {
      netItem = itemsService.getItem(equippedNet.item_id);
      if (netItem && netItem.effects) {
        for (const effect of netItem.effects) {
          if (effect.type === 'tier_multiplier') {
            rollOpts.multipliers[effect.tier] = (rollOpts.multipliers[effect.tier] || 1) * effect.value;
          }
        }
      }
    }

    // 2. Check selected Bait
    const baitId = interaction.options.getString('bait');
    let baitItem = null;
    if (baitId) {
      const ownedBait = ctx.query('getUserItem').get(userId, baitId);
      if (ownedBait && ownedBait.count > 0) {
        baitItem = itemsService.getItem(baitId);
        if (baitItem && baitItem.effects) {
          for (const effect of baitItem.effects) {
            if (effect.type === 'tier_multiplier') {
              rollOpts.multipliers[effect.tier] = (rollOpts.multipliers[effect.tier] || 1) * effect.value;
            } else if (effect.type === 'extra_catch') {
              rollOpts.extraCatches += effect.value;
            }
          }
        }
      } else {
        return ctx.sender.error(interaction, `You do not own any ${baitId}! Buy some from the \`/shop\`.`);
      }
    }

    // Execute in transaction
    const result = ctx.transaction(() => {
      // Deduct catch fee
      ctx.query('updateUserBalance').run(-catchCost, userId);

      // Decrement net durability if applicable
      if (equippedNet && equippedNet.durability > 0) {
        const nextDurability = equippedNet.durability - 1;
        if (nextDurability <= 0) {
          ctx.query('removeItem').run(userId, equippedNet.item_id);
        } else {
          ctx.query('updateItemDurability').run(nextDurability, userId, equippedNet.item_id);
        }
      }

      // Consume bait if used
      if (baitItem) {
        const ownedBait = ctx.query('getUserItem').get(userId, baitItem.id);
        if (ownedBait.count <= 1) {
          ctx.query('removeItem').run(userId, baitItem.id);
        } else {
          ctx.query('upsertUserItem').run(userId, baitItem.id, 'bait', -1, null, -1, null);
        }
      }

      // Roll insect(s)
      const countToCatch = 1 + rollOpts.extraCatches;
      const caughtInsects = [];
      let totalXpGained = 0;

      for (let i = 0; i < countToCatch; i++) {
        // Roll rarity tier with net/bait multipliers applied
        const rolled = rollModifiedInsect(insectService, rollOpts.multipliers);
        const meta = RARITY_MAP[rolled.rarity] || RARITY_MAP.common;
        caughtInsects.push(rolled);
        totalXpGained += meta.xp;

        // Upsert into user's collection
        ctx.query('catchInsect').run(userId, rolled.id);
      }

      // Update XP & level
      const updatedUser = ctx.query('getUser').get(userId);
      const currentXp = updatedUser.xp;
      const currentLevel = updatedUser.level;
      const newXp = currentXp + totalXpGained;
      const levelMeta = insectService.computeLevel(newXp);

      ctx.query('updateUserXP').run(newXp, levelMeta.level, userId);

      return {
        caught: caughtInsects,
        xpGained: totalXpGained,
        leveledUp: levelMeta.level > currentLevel,
        newLevel: levelMeta.level,
        title: levelMeta.title,
        titleEmoji: levelMeta.emoji,
        newBalance: updatedUser.balance - catchCost
      };
    });

    // Build reply embed
    const mainCatch = result.caught[0];
    const meta = RARITY_MAP[mainCatch.rarity] || RARITY_MAP.common;
    const currency = ctx.config.currencyName || '⌬';

    let description = `🎒 **Rustle in the bushes...**\n\nYou successfully captured a **${mainCatch.name}**!\nTier: **${meta.label}**\n\n📈 **+${result.xpGained} XP** gained!`;
    
    if (result.caught.length > 1) {
      const extras = result.caught.slice(1).map(c => `**${c.name}**`).join(', ');
      description += `\n✨ **Bonus Catches**: ${extras}`;
    }

    if (result.leveledUp) {
      description += `\n\n🌟 **Rank Level Up!** You reached **Level ${result.newLevel}** (${result.titleEmoji} *${result.title}*)!`;
    }

    const embed = {
      color: meta.color,
      title: `Insect Captured!`,
      description,
      footer: { text: `Balance: ${currency} ${ctx.fmt(result.newBalance)}` }
    };

    return ctx.sender.reply(interaction, embed);
  }
};

/**
 * Rolls an insect applying multipliers to rarity weights.
 */
function rollModifiedInsect(insectService, multipliers) {
  const ranks = { ...insectService.ranks };
  
  // Apply multipliers to rank weights
  const modifiedRanks = {};
  let totalWeight = 0;
  for (const [rankName, rankMeta] of Object.entries(ranks)) {
    const mult = multipliers[rankName] || 1.0;
    const weight = (rankMeta.rarity || 0) * mult;
    modifiedRanks[rankName] = weight;
    totalWeight += weight;
  }

  // Roll rarity tier
  const rand = Math.random() * totalWeight;
  let selectedRank = 'common';
  let runningSum = 0;
  for (const [rankName, weight] of Object.entries(modifiedRanks)) {
    runningSum += weight;
    if (rand <= runningSum) {
      selectedRank = rankName;
      break;
    }
  }

  const pool = insectService.pools[selectedRank] || [];
  if (!pool.length) {
    const flatCommon = insectService.pools['common'] || [];
    return { ...flatCommon[Math.floor(Math.random() * flatCommon.length)], rarity: 'common' };
  }

  const insect = pool[Math.floor(Math.random() * pool.length)];
  return {
    ...insect,
    rarity: selectedRank
  };
}
