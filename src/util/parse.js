/**
 * Centralized input parsing utilities.
 * Eliminates duplicated parseInt + isNaN checks across commands.
 */

/**
 * Parses a string into a positive integer amount.
 * @param {string|undefined} str
 * @returns {{ value: number } | { error: 'no_input' | 'invalid' }}
 */
export function parseAmount(str) {
  if (str === undefined || str === null || str === '') return { error: 'no_input' };
  if (str.toLowerCase() === 'all') return { value: 'all' };
  const n = parseInt(str, 10);
  if (isNaN(n) || n <= 0) return { error: 'invalid' };
  return { value: n };
}

/**
 * Returns the first mentioned user in a message, or null.
 * @param {Message} message
 * @returns {User | null}
 */
export function parseUser(message) {
  return message.mentions.users.first() ?? null;
}

/**
 * Formats milliseconds into a human-readable "Xh Ym" string.
 * @param {number} ms
 * @returns {string}
 */
export function formatTimeLeft(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
