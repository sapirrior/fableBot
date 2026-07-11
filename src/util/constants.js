/**
 * Shared constants for rarity colors and emoji indicators.
 * Used by collection, insectdex, profile, and leaderboard commands.
 */

export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_COLORS = {
  common:    0x95a5a6,
  uncommon:  0x2ecc71,
  rare:      0x5865F2,
  epic:      0x9B59B6,
  legendary: 0xF1C40F,
};

export const RARITY_EMOJI = {
  common:    '⬜',
  uncommon:  '🟩',
  rare:      '🟦',
  epic:      '🟪',
  legendary: '🟨',
};

/** Capitalize first letter of a string. */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
