/**
 * Service managing database-driven user bans and channel disabled commands.
 */
import { query } from '../db/index.js';
import { logger } from '../util/logger.js';

class BanService {
  isUserBanned(userId, commandName) {
    try {
      return !!query('checkUserBan').get(userId, commandName);
    } catch (err) {
      logger.error(`Database error checking user ban for ${userId}`, err, 'BanService');
      return false;
    }
  }

  isCommandDisabled(channelId, commandName) {
    try {
      return !!query('checkDisabledCommand').get(channelId, commandName);
    } catch (err) {
      logger.error(`Database error checking disabled command in channel ${channelId}`, err, 'BanService');
      return false;
    }
  }
}

export const banService = new BanService();
export default banService;
