/**
 * Script to list all custom emojis registered under the bot's Discord application.
 * 
 * Usage:
 *   node scripts/getEmoji.js [use_prod_token]
 * 
 * Example:
 *   node scripts/getEmoji.js
 */
import dotenv from 'dotenv';
import { resolve as pathResolve } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '../src/util/logger.js';

// Resolve dotenv relative to the script location to guarantee it finds the root .env
dotenv.config({ path: pathResolve('./.env') });

const [,, useProd] = process.argv;

// Select token based on flags and ENV status
const isTestEnv = process.env.ENV === 'TEST';
const token = useProd === 'true' || useProd === 'prod' 
  ? process.env.DISCORD_TOKEN
  : (isTestEnv ? process.env.TEST_TOKEN : process.env.DISCORD_TOKEN);

if (!token?.trim()) {
  logger.error('No valid token found in environment configuration.', null, 'EmojiLister');
  process.exit(1);
}

logger.info('Connecting to Discord to fetch application emojis...', 'EmojiLister');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    const appEmojis = await client.application.emojis.fetch();
    logger.info(`Found ${appEmojis.size} application emojis:`, 'EmojiLister');
    
    appEmojis.forEach(emoji => {
      console.log(`${emoji.name} = ${emoji.toString()} (${emoji.id})`);
    });
  } catch (err) {
    logger.error('Failed to fetch application emojis', err, 'EmojiLister');
  } finally {
    client.destroy();
  }
});

client.login(token).catch(err => {
  logger.error('Client login failed', err, 'EmojiLister');
  process.exit(1);
});
