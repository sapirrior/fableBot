/**
 * colors.js — Fable embed color palette.
 *
 * All colors are matched to the bot's purple/teal avatar.
 * Import named constants instead of hardcoding hex values in commands.
 *
 * Usage:
 *   import { COLORS } from '../../util/colors.js';
 *   ctx.sender.reply(interaction, { color: COLORS.MINT, description: '...' });
 */

export const COLORS = {
  /** Default brand purple — use for neutral/info embeds. */
  BRAND:   0x7B5EA7,

  /** Lighter purple — secondary info, help, indexes. */
  SOFT:    0x9B8EC4,

  /** Teal mint — positive economy actions (daily claim, give). */
  MINT:    0x4EC9A6,

  /** Warm gold — gambling wins, streaks, natural blackjack. */
  GOLD:    0xD4A843,

  /** Muted rose — gambling losses, forfeit. */
  ROSE:    0xC95F6E,

  /** Neutral slate — tie/push, draw, no change. */
  SLATE:   0x7A7F8E,

  /** Warm crimson — errors, validation failures, bans. */
  CRIMSON: 0xD94F4F,

  /** Deep void — reserved for dramatic/lore embeds. */
  VOID:    0x1A1A2E,
};
