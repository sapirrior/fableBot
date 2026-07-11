import { query } from '../db/index.js';
import { logger } from './logger.js';
import { SpamGuardService } from '../services/SpamGuardService.js';

const timerEmoji = '⏱';

/**
 * Middleware to check if a user or channel is banned/disabled,
 * or if they are spamming commands too fast.
 * 
 * @returns {boolean} true if command should proceed, false if blocked
 */
export async function check(ctx, message, commandObj) {
  const authorId = message.author.id;
  const channelId = message.channel.id;
  const command = commandObj.name.toLowerCase();

  const now = Date.now();

  // 1. Spam detection
  // Channel spam check (max 6 per 5 seconds)
  const cSpam = SpamGuardService.checkChannelSpam(channelId, now);
  
  if (cSpam.blockedUntil > now) return false;
  cSpam.count++;
  SpamGuardService.updateChannelSpam(channelId, cSpam);

  if (cSpam.count >= 6) {
    cSpam.blockedUntil = now + 5000;
    if (cSpam.count === 6) {
      ctx.sender.reply(message, timerEmoji, ', this channel is sending commands too fast! Please slow down.').catch(() => {});
    }
    return false;
  }

  // User spam check (max 3 per 5 seconds)
  const uSpam = SpamGuardService.checkUserSpam(authorId, now);

  if (uSpam.blockedUntil > now) return false;
  uSpam.count++;
  SpamGuardService.updateUserSpam(authorId, uSpam);

  if (uSpam.count >= 3) {
    uSpam.blockedUntil = now + 5000;
    if (uSpam.count === 3) {
      ctx.sender.reply(message, timerEmoji, ", slow down! You are typing commands too fast.").catch(() => {});
    }
    return false;
  }

  // 2. Database checks: user_ban and disabled_commands
  try {
    // Check user bans
    const userBan = query('checkUserBan').get(authorId, command);
    if (userBan) {
      ctx.sender.error(message, ", you're banned from this command! >:c").catch(() => {});
      // Set short block to prevent db spam if they keep trying
      uSpam.blockedUntil = now + 10000;
      return false;
    }

    // Check channel disabled commands
    // Allow 'enable' or 'disable' or core util commands to bypass if needed in the future, but standard commands obey it.
    if (!['enable', 'disable', 'help'].includes(command)) {
      const disabledCommand = query('checkDisabledCommand').get(channelId, command);
      if (disabledCommand) {
        ctx.sender.error(message, ', that command is disabled on this channel!').catch(() => {});
        uSpam.blockedUntil = now + 5000;
        return false;
      }
    }
  } catch (err) {
    logger.error('Database error in ban check', err, 'BanCheck');
    // Fail closed or open? Let's fail open to keep bot functioning, but log it.
  }

  return true;
}
