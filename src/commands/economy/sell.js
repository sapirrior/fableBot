import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { query } from '../../db/index.js';
import { insectService } from '../../services/InsectService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell insects from your collection back for coins.')
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
      opt.setName('target')
        .setDescription('Insect ID/name or rarity tier (e.g., Ladybug or common)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('count')
        .setDescription('Number of insects to sell, or "all"')
        .setRequired(false)
    ),
  category: 'economy',
  cooldown: 3000,

  async autocomplete(client, interaction) {
    const userId = interaction.user.id;
    try {
      const dbCollection = query('getCollection').all(userId) || [];
      const uniqueTiers = new Set();
      const choices = [];

      for (const col of dbCollection) {
        const insect = insectService.getById(col.insect_id);
        if (insect) {
          choices.push({ name: `${insect.emoji} ${insect.name} (Owned: x${col.count})`, value: insect.id });
          uniqueTiers.add(insect.rarity || 'common');
        }
      }

      for (const tier of uniqueTiers) {
        choices.unshift({ name: `All ${tier.charAt(0).toUpperCase() + tier.slice(1)} Ranks`, value: `tier:${tier}` });
      }

      await interaction.respond(choices.slice(0, 25));
    } catch (err) {
      await interaction.respond([]);
    }
  },

  /**
   * Executes the /sell command.
   */
  async execute(client, interaction, ctx) {
    const userId = interaction.user.id;
    const targetInput = interaction.options.getString('target');
    const countInput = interaction.options.getString('count') || '1';

    await ctx.sender.defer(interaction);

    const insectService = ctx.container.resolve('insects');
    const dbCollection = ctx.query('getCollection').all(userId);

    if (!dbCollection || dbCollection.length === 0) {
      return ctx.sender.error(interaction, `You don't have any insects to sell!`);
    }

    // Determine target mode (tier or specific insect)
    const isTierMode = targetInput.startsWith('tier:');
    const targetValue = isTierMode ? targetInput.substring(5) : targetInput;

    const itemsToSell = [];

    if (isTierMode) {
      // Find all owned insects of this tier
      for (const entry of dbCollection) {
        const insect = insectService.getById(entry.insect_id);
        if (insect && insect.rarity === targetValue) {
          itemsToSell.push({ entry, insect });
        }
      }
    } else {
      // Specific insect
      const insect = insectService.getById(targetValue);
      const entry = dbCollection.find(e => e.insect_id === targetValue || (insect && e.insect_id === insect.id));
      if (entry && insect) {
        itemsToSell.push({ entry, insect });
      }
    }

    if (itemsToSell.length === 0) {
      return ctx.sender.error(interaction, `Could not find any owned insects matching target "${targetValue}".`);
    }

    // Process transaction
    const result = ctx.transaction(() => {
      let totalPayout = 0;
      let totalSold = 0;
      const receipt = [];

      for (const { entry, insect } of itemsToSell) {
        const currentCount = entry.count;
        let countToSell = 0;

        if (countInput.toLowerCase() === 'all') {
          countToSell = currentCount;
        } else {
          countToSell = parseInt(countInput);
          if (isNaN(countToSell) || countToSell <= 0) {
            throw new Error('INVALID_COUNT');
          }
          countToSell = Math.min(countToSell, currentCount);
        }

        if (countToSell <= 0) continue;

        // Calculate logarithmic sell value payout
        let subtotal = 0;
        for (let i = 0; i < countToSell; i++) {
          subtotal += insectService.computeSellValue(insect, currentCount - i);
        }

        // Apply DB updates
        if (countToSell === currentCount) {
          ctx.query('removeInsect').run(userId, insect.id);
        } else {
          // Decrement by countToSell
          for (let i = 0; i < countToSell; i++) {
            ctx.query('decrementInsect').run(userId, insect.id);
          }
        }

        totalPayout += subtotal;
        totalSold += countToSell;
        receipt.push(`${insect.emoji} **${insect.name}** ×${countToSell} (+${subtotal} ⌬)`);
      }

      if (totalSold === 0) {
        throw new Error('NO_INSECTS_SOLD');
      }

      ctx.query('updateUserBalance').run(totalPayout, userId);
      const updatedUser = ctx.query('getUser').get(userId);

      return {
        totalPayout,
        totalSold,
        receipt,
        newBalance: updatedUser.balance
      };
    });

    const currency = ctx.config.currencyName || '⌬';
    const embed = {
      color: COLORS.MINT,
      title: `Insects Released!`,
      description: `You successfully released **${result.totalSold}** insects back to nature for **${currency} ${ctx.fmt(result.totalPayout)}**!\n\n${result.receipt.join('\n')}`,
      footer: { text: `Balance: ${currency} ${ctx.fmt(result.newBalance)}` }
    };

    return ctx.sender.reply(interaction, embed);
  }
};
