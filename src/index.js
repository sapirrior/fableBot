import 'dotenv/config';
import { Fable } from './fable.js';
import { logger } from './util/logger.js';

const bot = new Fable();

// Global Crash Prevention with crash rate limit tracking (D10 Fix)
let exceptionCount = 0;
let windowStartTime = Date.now();

function trackCrashRate(error, type) {
  const now = Date.now();
  if (now - windowStartTime > 60000) {
    exceptionCount = 0;
    windowStartTime = now;
  }

  exceptionCount++;
  logger.error(`${type} thrown:`, error, 'CrashGuard');

  if (exceptionCount >= 5) {
    logger.error(`CRITICAL: Detected ${exceptionCount} crash exceptions in under 60 seconds! Instability threshold reached.`, null, 'CrashLoop');
  }
}

process.on('unhandledRejection', (reason) => {
  trackCrashRate(reason, 'Unhandled Promise Rejection');
});

process.on('uncaughtException', (error) => {
  trackCrashRate(error, 'Uncaught Exception');
});

// Handle graceful shutdown
const shutdown = () => {
  bot.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the bot wrapper
await bot.start();

