/**
 * HighLowService — tracks active highlow game sessions to prevent double betting.
 * Automatically sweeps inactive sessions.
 */
import { logger } from '../util/logger.js';

const SESSION_TTL_MS = 3 * 60 * 1000; // 3 minutes
const SWEEP_INTERVAL = 5 * 60 * 1000; // 5 minutes

/** @type {Map<string, number>} Map of userId -> timestamp of session start */
const sessions = new Map();

/**
 * Starts the background sweeper to evict stale highlow sessions.
 * Called once during bot boot.
 * @returns {void}
 */
export function startHighLowSweeper() {
  const interval = setInterval(() => {
    const now = Date.now();
    let sweptCount = 0;
    for (const [userId, ts] of sessions.entries()) {
      if (now - ts > SESSION_TTL_MS) {
        sessions.delete(userId);
        sweptCount++;
      }
    }
    if (sweptCount > 0) {
      logger.info(`Swept ${sweptCount} stale HighLow session(s).`, 'HighLowService');
    }
  }, SWEEP_INTERVAL);
  interval.unref?.();
}

/**
 * Checks if a user has an active HighLow game session.
 * @param {string} userId The Discord user ID.
 * @returns {boolean} True if a session exists, false otherwise.
 */
export function hasSession(userId) {
  return sessions.has(userId);
}

/**
 * Registers an active HighLow game session for the user.
 * @param {string} userId The Discord user ID.
 * @returns {void}
 */
export function startSession(userId) {
  sessions.set(userId, Date.now());
}

/**
 * Ends and removes the HighLow game session for the user.
 * @param {string} userId The Discord user ID.
 * @returns {void}
 */
export function endSession(userId) {
  sessions.delete(userId);
}

export const highlowService = {
  hasSession,
  startSession,
  endSession,
  startHighLowSweeper
};

