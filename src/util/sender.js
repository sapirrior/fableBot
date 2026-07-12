/**
 * sender.js — Centralized interaction reply utility.
 *
 * All bot responses are embed-based. Supports ephemeral replies via
 * flag 64 (MessageFlags.Ephemeral). Handles deferred/replied state
 * transparently so commands never need to worry about interaction lifecycle.
 *
 * Color:
 *   - Default replies use COLORS.BRAND (purple).
 *   - Errors always use COLORS.CRIMSON, always ephemeral.
 *   - Commands that need a non-default color import COLORS and pass it as
 *     embedOpts.color — sender will use it as-is.
 */
import { MessageFlags } from 'discord.js';
import { COLORS } from './colors.js';

/**
 * Sends or edits a reply safely regardless of interaction state.
 * Applies COLORS.BRAND by default; pass embedOpts.color to override.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {object}  embedOpts  - Raw embed data: description, title, fields,
 *                               author, footer, thumbnail, color (optional)
 * @param {boolean} [ephemeral=false]
 * @returns {Promise}
 */
export async function reply(interaction, embedOpts, ephemeral = false) {
  const embed = { color: COLORS.BRAND, ...embedOpts };
  const payload = {
    embeds: [embed],
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

/**
 * Sends an ephemeral error embed reply.
 * Always COLORS.CRIMSON, always flag 64 — never pollutes the channel.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} description
 * @returns {Promise}
 */
export async function error(interaction, description) {
  return reply(interaction, { color: COLORS.CRIMSON, description }, true);
}

/**
 * Defers the reply with an optional ephemeral flag.
 * Use before any async work to prevent the 3-second timeout.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {boolean} [ephemeral=false]
 * @returns {Promise}
 */
export async function defer(interaction, ephemeral = false) {
  return interaction.deferReply({
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {}),
  });
}
