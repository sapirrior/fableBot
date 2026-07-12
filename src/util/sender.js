/**
 * sender.js — Centralized interaction reply utility.
 *
 * All bot responses are embed-based. Supports ephemeral replies via
 * flag 64 (MessageFlags.Ephemeral). Handles deferred/replied state
 * transparently so commands never need to worry about interaction lifecycle.
 */
import { MessageFlags } from 'discord.js';
import { configManager } from '../services/ConfigService.js';

/**
 * Resolves the embed base color from config.
 * @returns {number}
 */
function getColor() {
  const raw = configManager.get('embedColor') || '6D3CCF';
  return parseInt(raw.replace('#', ''), 16);
}

/**
 * Sends or edits a reply safely regardless of interaction state.
 * Automatically applies the configured embed color.
 *
 * @param {ChatInputCommandInteraction} interaction
 * @param {object}  embedOpts  - Raw embed data (description, title, fields, author, footer, thumbnail)
 * @param {boolean} [ephemeral=false] - Whether to use flag 64
 * @returns {Promise}
 */
export async function reply(interaction, embedOpts, ephemeral = false) {
  const embed = { color: getColor(), ...embedOpts };
  const payload = {
    embeds: [embed],
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {})
  };

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply(payload);
  }
  return interaction.reply(payload);
}

/**
 * Sends an ephemeral error embed reply.
 * Always uses flag 64 so errors never pollute channels.
 *
 * @param {ChatInputCommandInteraction} interaction
 * @param {string} description - Error message text
 * @returns {Promise}
 */
export async function error(interaction, description) {
  return reply(interaction, {
    description,
    color: 0xED4245
  }, true);
}

/**
 * Defers the reply with an optional ephemeral flag.
 * Use before any async work to prevent the 3-second timeout.
 *
 * @param {ChatInputCommandInteraction} interaction
 * @param {boolean} [ephemeral=false]
 * @returns {Promise}
 */
export async function defer(interaction, ephemeral = false) {
  return interaction.deferReply({
    ...(ephemeral ? { flags: MessageFlags.Ephemeral } : {})
  });
}
