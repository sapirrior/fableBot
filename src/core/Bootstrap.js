/**
 * Orchestrates the application bootstrap phase.
 * Sets up dependency ordering and populates the ServiceContainer.
 */
import { Client, GatewayIntentBits, Options } from 'discord.js';
import { initDb, closeDb } from '../db/index.js';
import { loadCommands } from '../handlers/commandHandler.js';
import { loadEvents } from '../handlers/eventHandler.js';
import { startCooldownSweeper } from '../util/cooldown.js';
import { logger } from '../util/logger.js';
import { configManager } from '../services/ConfigService.js';
import { insectService } from '../services/InsectService.js';
import { SpamGuardService } from '../services/SpamGuardService.js';
import { backupService } from '../services/BackupService.js';
import { emojiService } from '../services/EmojiService.js';
import { container } from './ServiceContainer.js';

/**
 * Orchestrates the application bootstrap phase.
 * @returns {Promise<Client>} Resolved Discord Client instance.
 */
export async function bootstrap() {
  logger.info('Initializing application bootstrap sequence...', 'Bootstrap');

  // 1. Verify and Select Environment Token
  const isTest = process.env.ENV === 'TEST';
  const token = isTest ? process.env.TEST_TOKEN : process.env.DISCORD_TOKEN;
  
  if (!token?.trim()) {
    logger.error(`${isTest ? 'TEST_TOKEN' : 'DISCORD_TOKEN'} is missing in the environment or .env file.`, null, 'Bootstrap');
    process.exit(1);
  }

  // 2. Initialize Database with boot-crash safety
  try {
    initDb();
    logger.info('SQLite database initialized.', 'Database');
  } catch (err) {
    logger.error('Failed to initialize database during startup', err, 'Bootstrap');
    closeDb();
    process.exit(1);
  }

  // 3. Register services to ServiceContainer
  container.register('config', configManager);
  container.register('insects', insectService);
  container.register('spamGuard', SpamGuardService);
  container.register('backup', backupService);
  container.register('emojis', emojiService);
  logger.info('Registered services to ServiceContainer.', 'Bootstrap');

  // 4. Start sweepers
  const config = configManager.getAll();
  startCooldownSweeper(config.cooldownSweepIntervalMs || 300000);
  SpamGuardService.startSpamSweeper(config.cooldownSweepIntervalMs || 60000);
  logger.info('Auto-cleaning cache sweepers started.', 'Sweeper');

  // 5. Load Command registry
  await loadCommands();

  // 6. Build Client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent
    ],
    makeCache: Options.cacheWithLimits({
      MessageManager: 10,
      UserManager: 100,
      GuildMemberManager: 100,
      ReactionManager: 0,
      GuildEmojiManager: 0,
      GuildStickerManager: 0,
      GuildInviteManager: 0,
      GuildScheduledEventManager: 0,
      ThreadManager: 0,
      VoiceStateManager: 0
    })
  });

  // 7. Load and register events
  await loadEvents(client);

  client.on('error', (err) => logger.error('Discord gateway error', err, 'Client'));

  // 8. Connect to Discord Gateway
  try {
    await client.login(token);
  } catch (err) {
    logger.error('Login failed:', err, 'Discord');
    closeDb();
    process.exit(1);
  }

  return client;
}
