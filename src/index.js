import 'dotenv/config';
import { Client, GatewayIntentBits, Options } from 'discord.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initDb, closeDb } from './db/index.js';
import { loadCommands } from './handlers/commandHandler.js';
import { onMessageCreate } from './handlers/messageCreate.js';
import { startCooldownSweeper } from './util/cooldown.js';

// Read config
const config = JSON.parse(readFileSync(resolve('./src/configs/config.json'), 'utf8'));

// Verify environment setup
if (!process.env.DISCORD_TOKEN) {
  console.error('[Error] DISCORD_TOKEN is missing in the environment or .env file.');
  process.exit(1);
}

// Bootstrap Database
initDb();
console.log('[Database] Initialized SQLite database (STRICT tables).');

// Start Cooldown Sweeper
startCooldownSweeper(config.cooldownSweepIntervalMs);
console.log('[Sweeper] Cooldown sweeper started.');

// Load Commands
await loadCommands();

// Build Discord Client with memory-conservative limits
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

client.once('clientReady', () => {
  console.log(`[Fable] Logged in as ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
  onMessageCreate(client, message);
});

// Handle graceful shutdown
const shutdown = () => {
  console.log('\n[Fable] Shutdown signal received. Cleaning up...');
  client.destroy();
  closeDb();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Connect to Discord Gateway
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('[Discord] Login failed:', err);
  closeDb();
  process.exit(1);
});
