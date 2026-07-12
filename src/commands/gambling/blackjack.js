import {
  SlashCommandBuilder,
  ApplicationIntegrationType,
  InteractionContextType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import {
  hasSession, createSession, getSession, endSession,
  hit, dealerPlay, outcome, payout, handValue, buildEmbed,
} from '../../services/BlackjackService.js';

const MAX_BET        = 250_000;
const BUTTON_TIMEOUT = 60_000; // 60 s — then collector ends, bet forfeited, no retry

// ─── Reusable button row ─────────────────────────────────────────────────────
function makeButtons(disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('bj_hit')
      .setLabel('Hit')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId('bj_stand')
      .setLabel('Stand')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled),
  );
}

// ─── Shared settle helper — DB write → endSession → editReply ────────────────
// Important: endSession AFTER editReply to avoid losing state if the edit throws.
async function settle(interaction, userId, session, result, balanceBefore, bet, ctx) {
  const currency   = ctx.config.currencyName || '⌬';
  const delta      = payout(result, bet);
  const newBalance = balanceBefore - bet + bet + delta; // balanceBefore has bet already deducted

  // 1. Apply payout — bet refund + any winnings (delta = 0 on tie/bust means refund only)
  ctx.transaction(() => ctx.query('updateUserBalance').run(bet + delta, userId));

  // 2. Build and send final embed
  const endEmbed = buildEmbed({
    user: interaction.user,
    session,
    gameOver: true,
    result,
    newBalance,
    fmt: ctx.fmt,
    currency,
    emojiGet: ctx.emoji,
  });
  await interaction.editReply({ embeds: [endEmbed], components: [makeButtons(true)] });

  // 3. Mark session done only after successful reply (so state is not lost on throw)
  endSession(userId);
}

export default {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a hand of blackjack against the dealer.')
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

  cooldown: 8000,

  async execute(client, interaction, ctx) {
    const userId   = interaction.user.id;
    const currency = ctx.config.currencyName || '⌬';

    // ── Guard: active session already running ──────────────────────────────
    if (hasSession(userId)) {
      return ctx.sender.error(interaction, 'You already have an active blackjack game. Finish it first.');
    }

    // ── Parse and validate bet ─────────────────────────────────────────────
    const parsed = ctx.parse.parseAmount(interaction.options.getString('amount'));
    if (parsed.error) {
      return ctx.sender.error(interaction, 'Please provide a valid bet amount (e.g. `500` or `all`).');
    }

    const dbUser  = ctx.query('getUser').get(userId);
    const balance = dbUser?.balance ?? 0;

    let bet = parsed.value === 'all' ? balance : parsed.value;
    if (bet > MAX_BET) bet = MAX_BET;

    if (bet <= 0) {
      return ctx.sender.error(interaction, 'You need at least **1 coin** to play blackjack.');
    }
    if (balance < bet) {
      return ctx.sender.error(
        interaction,
        `You only have **${ctx.fmt(balance)} ${currency}** — not enough to bet **${ctx.fmt(bet)}**.`,
      );
    }

    // ── Defer so we have time to deal + check natural BJ ──────────────────
    await ctx.sender.defer(interaction);

    // ── Deduct bet upfront (returned/paid on resolution) ──────────────────
    ctx.transaction(() => ctx.query('updateUserBalance').run(-bet, userId));

    // ── Deal ───────────────────────────────────────────────────────────────
    const session = createSession(userId, bet);

    // ── Instant natural blackjack check (2-card 21) ────────────────────────
    if (handValue(session.playerHand).points === 21) {
      const settled = dealerPlay(userId);
      const res     = outcome(settled);
      await settle(interaction, userId, settled, res, balance, bet, ctx);
      return;
    }

    // ── Send initial game embed with buttons ───────────────────────────────
    const initEmbed = buildEmbed({
      user: interaction.user, session, fmt: ctx.fmt, currency, emojiGet: ctx.emoji,
    });
    await interaction.editReply({ embeds: [initEmbed], components: [makeButtons()] });

    const message = await interaction.fetchReply();

    // ── Button collector (one session, 60 s window, no retry on timeout) ──
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId,
      time: BUTTON_TIMEOUT,
    });

    collector.on('collect', async btnInt => {
      // Acknowledge button immediately to prevent "Interaction failed"
      await btnInt.deferUpdate();

      const s = getSession(userId);
      if (!s || s.done) { collector.stop('done'); return; }

      try {
        if (btnInt.customId === 'bj_hit') {
          // ── HIT ──────────────────────────────────────────────────────────
          const updated = hit(userId);
          const pVal    = handValue(updated.playerHand).points;

          if (pVal > 21) {
            // Bust — resolve immediately
            collector.stop('done');
            // Build bust embed, settle DB, then endSession
            const currency2 = ctx.config.currencyName || '⌬';
            const newBalance = balance - bet;
            const bustEmbed = buildEmbed({
              user: interaction.user, session: updated,
              gameOver: true, result: 'lose', newBalance,
              fmt: ctx.fmt, currency: currency2, emojiGet: ctx.emoji,
            });
            await interaction.editReply({ embeds: [bustEmbed], components: [makeButtons(true)] });
            // No refund on bust — bet was already deducted, delta = -bet, net = 0 added back
            endSession(userId);
            return;
          }

          // Still in play — refresh embed
          const midEmbed = buildEmbed({
            user: interaction.user, session: updated, fmt: ctx.fmt, currency, emojiGet: ctx.emoji,
          });
          await interaction.editReply({ embeds: [midEmbed], components: [makeButtons()] });

        } else if (btnInt.customId === 'bj_stand') {
          // ── STAND ─────────────────────────────────────────────────────────
          collector.stop('done');
          const settled = dealerPlay(userId);
          const res     = outcome(settled);
          await settle(interaction, userId, settled, res, balance, bet, ctx);
        }
      } catch (err) {
        // If service throws (session swept mid-game), stop cleanly
        collector.stop('done');
        endSession(userId);
      }
    });

    collector.on('end', async (_, reason) => {
      if (reason === 'done') return;

      // Timed out — forfeit bet (no refund, no retry prompt)
      const s = getSession(userId);
      if (!s || s.done) return;
      endSession(userId);
      try {
        const currency2   = ctx.config.currencyName || '⌬';
        const newBalance  = balance - bet;
        const timeoutEmbed = buildEmbed({
          user: interaction.user, session: s,
          gameOver: true, result: 'lose', newBalance,
          fmt: ctx.fmt, currency: currency2, emojiGet: ctx.emoji,
        });
        await interaction.editReply({ embeds: [timeoutEmbed], components: [makeButtons(true)] });
      } catch { /* message deleted or interaction expired */ }
    });
  },
};
