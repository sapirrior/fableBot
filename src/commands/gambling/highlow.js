import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { randomInt } from 'node:crypto';
import { COLORS } from '../../util/colors.js';

const BUTTON_TIMEOUT = 60000; // 60 seconds

/**
 * Creates the buttons row for the HighLow game.
 * @param {boolean} [disabled=false] Whether the buttons should be disabled.
 * @returns {ActionRowBuilder} The constructed action row.
 */
function makeButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('hl_higher')
      .setLabel('Higher')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('hl_lower')
      .setLabel('Lower')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('hl_jackpot')
      .setLabel('Jackpot')
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('highlow')
    .setDescription('Bet if a hidden number (1-100) is higher, lower, or equal to a hint number.')
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
      opt.setName('amount')
        .setDescription('Amount to bet (number or "all")')
        .setRequired(true),
    ),

  cooldown: 5000,

  /**
   * Executes the HighLow command, starting the game and running the button collector.
   * @param {import('discord.js').Client} client The Discord client instance.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction The command interaction.
   * @param {object} ctx The injected command context.
   * @returns {Promise<void>}
   */
  async execute(client, interaction, ctx) {
    const userId = interaction.user.id;
    const currency = ctx.config.currencyName || '⌬';

    // 1. Guard: active HighLow session already running
    if (ctx.highlow.hasSession(userId)) {
      return ctx.sender.error(interaction, 'You already have an active High-Low game. Finish it first.');
    }

    // 2. Parse and validate bet
    const parsed = ctx.parse.parseAmount(interaction.options.getString('amount'));
    if (parsed.error) {
      return ctx.sender.error(interaction, 'Please provide a valid bet amount (e.g. `500` or `all`).');
    }

    const dbUser = ctx.query('getUser').get(userId);
    const balance = dbUser?.balance ?? 0;

    const maxBet = ctx.config.maxBetLimit || 250000;
    let bet = parsed.value === 'all' ? balance : parsed.value;
    if (bet > maxBet) bet = maxBet;

    if (bet <= 0) {
      return ctx.sender.error(interaction, 'You need at least **1 coin** to play High-Low.');
    }
    if (balance < bet) {
      return ctx.sender.error(
        interaction,
        `You only have **${currency} ${ctx.fmt(balance)}** — not enough to bet **${currency} ${ctx.fmt(bet)}**.`,
      );
    }

    // 3. Defer so we have time to register and set up
    await ctx.sender.defer(interaction);

    // 4. Register session & deduct bet upfront
    ctx.highlow.startSession(userId);
    ctx.transaction(() => ctx.query('updateUserBalance').run(-bet, userId));

    // 5. Roll numbers
    const H = randomInt(1, 101); // Hidden number: 1 to 100 inclusive
    const x = randomInt(1, 101); // Hint number: 1 to 100 inclusive

    // 6. Send initial game embed
    const initEmbed = {
      color: COLORS.SOFT,
      author: {
        name: `${interaction.user.username}, you bet ${currency} ${ctx.fmt(bet)} on High-Low`,
        icon_url: interaction.user.displayAvatarURL({ size: 64 }),
      },
      description: `I have chosen a hidden number between **1** and **100**.\n` +
                   `The hint number is **${x}**.\n\n` +
                   `Is the hidden number **higher**, **lower**, or exactly the **same** (Jackpot)?`,
      footer: { text: `Balance: ${currency} ${ctx.fmt(balance - bet)}  ·  60s to guess` },
    };

    await interaction.editReply({ embeds: [initEmbed], components: [makeButtons()] });
    const message = await interaction.fetchReply();

    // 7. Button collector
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId,
      time: BUTTON_TIMEOUT,
    });

    await new Promise((resolve) => {
      collector.on('collect', async btnInt => {
        await btnInt.deferUpdate();
        collector.stop('done');

        // Check if session still exists (just in case of double triggers or sweeper eviction)
        if (!ctx.highlow.hasSession(userId)) {
          resolve();
          return;
        }

        try {
          const choice = btnInt.customId; // hl_higher, hl_lower, hl_jackpot
          let result = 'lose'; // win, push, lose
          let payoutAmount = 0;
          let description = '';
          let color = COLORS.ROSE;

          const jackpotMult = ctx.config.highlowJackpotMultiplier || 50;

          if (choice === 'hl_jackpot') {
            if (H === x) {
              result = 'win';
              payoutAmount = bet * (jackpotMult + 1); // jackpotMult profit + refund bet
              description = `**JACKPOT!** The hidden number was **${H}** (equal to **${x}**).\n` +
                            `You won a massive **+${currency} ${ctx.fmt(bet * jackpotMult)}**!`;
              color = COLORS.GOLD;
            } else {
              description = `You guessed **Jackpot**, but the hidden number was **${H}** (hint was **${x}**).\n` +
                            `You lost **−${currency} ${ctx.fmt(bet)}**.`;
            }
          } else if (H === x) {
            // Player guessed Higher or Lower, but it was exactly equal (Push)
            result = 'push';
            payoutAmount = bet; // refund bet
            description = `The hidden number was **${H}** (equal to **${x}**).\n` +
                          `Since you guessed **${choice === 'hl_higher' ? 'Higher' : 'Lower'}**, it's a **push** (bet refunded).`;
            color = COLORS.SLATE;
          } else if (choice === 'hl_higher') {
            if (H > x) {
              result = 'win';
              payoutAmount = bet * 2; // 2x payout (refund + 1x profit)
              description = `**Correct!** The hidden number was **${H}** (greater than **${x}**).\n` +
                            `You won **+${currency} ${ctx.fmt(bet)}**!`;
              color = COLORS.GOLD;
            } else {
              description = `The hidden number was **${H}** (less than **${x}**).\n` +
                            `You lost **−${currency} ${ctx.fmt(bet)}**.`;
            }
          } else if (choice === 'hl_lower') {
            if (H < x) {
              result = 'win';
              payoutAmount = bet * 2; // 2x payout
              description = `**Correct!** The hidden number was **${H}** (less than **${x}**).\n` +
                            `You won **+${currency} ${ctx.fmt(bet)}**!`;
              color = COLORS.GOLD;
            } else {
              description = `The hidden number was **${H}** (greater than **${x}**).\n` +
                            `You lost **−${currency} ${ctx.fmt(bet)}**.`;
            }
          }

          // 8. Settle: Write payout -> Edit reply -> End session
          if (payoutAmount > 0) {
            ctx.transaction(() => ctx.query('updateUserBalance').run(payoutAmount, userId));
          }

          const newBalance = balance - bet + payoutAmount;
          const endEmbed = {
            color,
            author: {
              name: `${interaction.user.username}'s High-Low Game`,
              icon_url: interaction.user.displayAvatarURL({ size: 64 }),
            },
            description,
            footer: { text: `Balance: ${currency} ${ctx.fmt(newBalance)}` },
          };

          await interaction.editReply({ embeds: [endEmbed], components: [makeButtons(true)] });
        } catch (err) {
          logger.error('Error settling HighLow command interaction', err, 'HighLowCommand');
        } finally {
          ctx.highlow.endSession(userId);
          resolve();
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'done') {
          // Timed out - forfeit bet
          if (ctx.highlow.hasSession(userId)) {
            ctx.highlow.endSession(userId);
            try {
              const newBalance = balance - bet;
              const timeoutEmbed = {
                color: COLORS.ROSE,
                author: {
                  name: `${interaction.user.username}'s High-Low Game`,
                  icon_url: interaction.user.displayAvatarURL({ size: 64 }),
                },
                description: `**Time expired!** You didn't make a choice in time.\n` +
                              `The hidden number was **${H}**.\n` +
                              `You forfeited **−${currency} ${ctx.fmt(bet)}**.`,
                footer: { text: `Balance: ${currency} ${ctx.fmt(newBalance)}` },
              };
              await interaction.editReply({ embeds: [timeoutEmbed], components: [makeButtons(true)] });
            } catch { /* message deleted or interaction expired */ }
          }
        }
        resolve();
      });
    });
  },
};
