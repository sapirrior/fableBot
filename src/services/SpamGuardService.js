/**
 * Service to manage command execution rate limits (spam checks).
 * Bounds memory dynamically by cleaning up inactive entries.
 */
import { logger } from '../util/logger.js';

const userSpam = new Map();    // userId -> { count, blockedUntil, lastCheck }
const channelSpam = new Map(); // channelId -> { count, blockedUntil, lastCheck }
let sweepInterval = null;

export const SpamGuardService = {
  checkChannelSpam(channelId, now) {
    let cSpam = channelSpam.get(channelId);
    if (!cSpam || now > cSpam.lastCheck + 5000) {
      cSpam = { count: 0, blockedUntil: 0, lastCheck: now };
    }
    return cSpam;
  },

  updateChannelSpam(channelId, cSpam) {
    channelSpam.set(channelId, cSpam);
  },

  checkUserSpam(userId, now) {
    let uSpam = userSpam.get(userId);
    if (!uSpam || now > uSpam.lastCheck + 5000) {
      uSpam = { count: 0, blockedUntil: 0, lastCheck: now };
    }
    return uSpam;
  },

  updateUserSpam(userId, uSpam) {
    userSpam.set(userId, uSpam);
  },

  startSpamSweeper(intervalMs = 60000) {
    this.stopSpamSweeper();
    
    sweepInterval = setInterval(() => {
      const now = Date.now();
      let sweptUsers = 0;
      let sweptChannels = 0;

      // Clean inactive user entries
      for (const [userId, record] of userSpam.entries()) {
        if (now > record.lastCheck + 5000 && now > record.blockedUntil) {
          userSpam.delete(userId);
          sweptUsers++;
        }
      }

      // Clean inactive channel entries
      for (const [channelId, record] of channelSpam.entries()) {
        if (now > record.lastCheck + 5000 && now > record.blockedUntil) {
          channelSpam.delete(channelId);
          sweptChannels++;
        }
      }

      if (sweptUsers > 0 || sweptChannels > 0) {
        logger.debug(`SpamGuard clean: swept ${sweptUsers} inactive users, ${sweptChannels} channels.`, 'SpamGuard');
      }
    }, intervalMs);
    sweepInterval.unref();
  },

  stopSpamSweeper() {
    if (sweepInterval) {
      clearInterval(sweepInterval);
      sweepInterval = null;
    }
  }
};
