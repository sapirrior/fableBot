/**
 * ownerGuard.js — Owner identity check utility.
 * Reads ownerId from config.json via ConfigManager.
 * Used by interactionCreate to gate ownerOnly commands.
 */
import { configManager } from '../services/ConfigService.js';

/**
 * Returns true if the given user ID matches the configured bot owner.
 * @param {string} userId
 * @returns {boolean}
 */
export function isOwner(userId) {
  const ownerId = configManager.get('ownerId');
  return !!ownerId && userId === String(ownerId);
}
