import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';
import { logger } from '../../util/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Display Fable catchers leaderboards or check your position.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View the top 10 leaderboard lists')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('The category leaderboard to view')
            .setRequired(true)
            .addChoices(
              { name: 'Coins', value: 'coins' },
              { name: 'Level', value: 'level' },
              { name: 'Collection', value: 'collection' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('mine')
        .setDescription('View your own ranking position')
        .addStringOption(opt =>
          opt.setName('category')
            .setDescription('The category to check your rank in')
            .setRequired(true)
            .addChoices(
              { name: 'Coins', value: 'coins' },
              { name: 'Level', value: 'level' },
              { name: 'Collection', value: 'collection' }
            )
        )
    ),
  category: 'economy',
  cooldown: 180000, // 3-minute cooldown (180,000ms)

  /**
   * Executes the /leaderboard command.
   * @param {import('discord.js').Client} client The Discord client instance.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction The command interaction.
   * @param {object} ctx The injected command context.
   * @returns {Promise<void>}
   */
  async execute(client, interaction, ctx) {
    const subcommand = interaction.options.getSubcommand();
    const category = interaction.options.getString('category');
    const ownerId = ctx.config.ownerId;
    const userId = interaction.user.id;
    const currency = ctx.config.currencyName || '⌬';

    // Defer early before async database queries
    await ctx.sender.defer(interaction);

    try {
      if (subcommand === 'view') {
        let list = [];
        let title = '';

        if (category === 'coins') {
          title = 'Top Coin Balances';
          const rows = ctx.query('getTopBalance').all(15) || [];
          list = rows.filter(r => r.user_id !== ownerId).slice(0, 10);
        } else if (category === 'level') {
          title = 'Top Catcher Levels';
          const rows = ctx.query('getTopXP').all(15) || [];
          list = rows.filter(r => r.user_id !== ownerId).slice(0, 10);
        } else if (category === 'collection') {
          title = 'Top Insect Collections';
          const rows = ctx.query('getTopCollection').all(15) || [];
          list = rows.filter(r => r.user_id !== ownerId).slice(0, 10);
        }

        // Fetch all usernames in parallel (optimization to prevent rate-limit delays)
        const fetchPromises = list.map(async (row) => {
          let username = 'Unknown User';
          try {
            const userObj = await client.users.fetch(row.user_id);
            username = userObj.username;
          } catch {
            username = `User (${row.user_id})`;
          }
          return { username, row };
        });

        const resolvedEntries = await Promise.all(fetchPromises);
        const descriptionLines = [];

        if (category === 'coins') {
          resolvedEntries.forEach((entry, idx) => {
            descriptionLines.push(`#${idx + 1} **${entry.username}** · **${currency} ${ctx.fmt(entry.row.balance)}**`);
          });
        } else if (category === 'level') {
          const insectService = ctx.container.resolve('insects');
          resolvedEntries.forEach((entry, idx) => {
            const lvlMeta = insectService.computeLevel(entry.row.xp);
            descriptionLines.push(`#${idx + 1} **${entry.username}** · Level **${entry.row.level}** (${lvlMeta.emoji} *${lvlMeta.title}*)`);
          });
        } else if (category === 'collection') {
          resolvedEntries.forEach((entry, idx) => {
            descriptionLines.push(`#${idx + 1} **${entry.username}** · **${ctx.fmt(entry.row.total)}** insects caught`);
          });
        }

        if (descriptionLines.length === 0) {
          descriptionLines.push('*No catchers recorded on this leaderboard yet.*');
        }

        const embed = {
          color: COLORS.BRAND,
          title,
          description: descriptionLines.join('\n'),
          footer: {
            text: 'Fable Catcher Leaderboard'
          }
        };

        return ctx.sender.reply(interaction, embed);
      }

      if (subcommand === 'mine') {
        if (userId === ownerId) {
          return ctx.sender.error(interaction, 'The bot owner is excluded from leaderboards.');
        }

        // Initialize user entry if not exists
        ctx.query('upsertUser').run(userId);
        const dbUser = ctx.query('getUser').get(userId);

        let rank = 0;
        let valueText = '';
        let categoryName = '';

        if (category === 'coins') {
          categoryName = 'Coins';
          const res = ctx.query('getUserBalanceRank').get(userId, ownerId);
          rank = res?.rank ?? 1;
          valueText = `**${currency} ${ctx.fmt(dbUser.balance)}**`;
        } else if (category === 'level') {
          categoryName = 'Level';
          const res = ctx.query('getUserXPRank').get(userId, ownerId);
          rank = res?.rank ?? 1;
          const insectService = ctx.container.resolve('insects');
          const lvlMeta = insectService.computeLevel(dbUser.xp);
          valueText = `Level **${dbUser.level}** (${lvlMeta.emoji} *${lvlMeta.title}*)`;
        } else if (category === 'collection') {
          categoryName = 'Collection';
          const res = ctx.query('getUserCollectionRank').get(ownerId, userId);
          rank = res?.rank ?? 1;

          // Get total caught insects count
          const coll = ctx.query('getCollection').all(userId) || [];
          const totalInsects = coll.reduce((sum, item) => sum + item.count, 0);
          valueText = `**${ctx.fmt(totalInsects)}** insects caught`;
        }

        const embed = {
          color: COLORS.BRAND,
          title: `Your ${categoryName} Rank`,
          description: `You are ranked **#${rank}** on the ${categoryName.toLowerCase()} leaderboard.\n\nYour score: ${valueText}`,
          footer: {
            text: 'Fable Catcher Leaderboard'
          }
        };

        return ctx.sender.reply(interaction, embed);
      }
    } catch (err) {
      logger.error('Error executing leaderboard command', err, 'LeaderboardCommand');
      return ctx.sender.error(interaction, 'An error occurred while fetching the leaderboard.');
    }
  }
};
