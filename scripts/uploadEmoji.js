/**
 * Script to upload a custom emoji to the bot's Discord application from a CDN URL.
 * 
 * Usage:
 *   node scripts/uploadEmoji.js <emoji_name> <image_url> [use_prod_token]
 * 
 * Example:
 *   node scripts/uploadEmoji.js logo https://cdn.discordapp.com/emojis/123456789.png
 */
import dotenv from 'dotenv';
import { resolve as pathResolve } from 'path';
import { Client, GatewayIntentBits } from 'discord.js';
import { logger } from '../src/util/logger.js';

// Resolve dotenv relative to the script location to guarantee it finds the root .env
dotenv.config({ path: pathResolve('./.env') });

const [,, name, url, useProd] = process.argv;

if (!name || !url) {
  console.log(`
Usage:
  node scripts/uploadEmoji.js <emoji_name> <image_url> [use_prod_token]

Example:
  node scripts/uploadEmoji.js logo https://cdn.discordapp.com/emojis/123456789.png
  `);
  process.exit(1);
}

// Select token based on flags and ENV status
const isTestEnv = process.env.ENV === 'TEST';
const token = useProd === 'true' || useProd === 'prod' 
  ? process.env.DISCORD_TOKEN // DISCORD_TOKEN is now our Production Token
  : (isTestEnv ? process.env.TEST_TOKEN : process.env.DISCORD_TOKEN);

if (!token?.trim()) {
  logger.error('No valid token found in environment configuration.', null, 'EmojiUploader');
  process.exit(1);
}

logger.info(`Starting upload of "${name}" using url: ${url}`, 'EmojiUploader');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  try {
    // 1. Fetch image from CDN URL as a buffer
    logger.info('Fetching image from URL...', 'EmojiUploader');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.startsWith('image/')) {
      throw new Error(`URL did not point to an image. Content-Type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    // Convert to a base64 Data URL format required by Discord.js API
    const base64Data = imageBuffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Data}`;

    // 2. Upload to bot's application emojis
    logger.info('Uploading emoji to Discord application...', 'EmojiUploader');
    const emoji = await client.application.emojis.create({
      attachment: imageBuffer,
      name: name
    });

    logger.info(`Successfully uploaded custom emoji!`, 'EmojiUploader');
    console.log(`EMOJI_CREATED: ${emoji.name} = ${emoji.toString()} (${emoji.id})`);
  } catch (err) {
    logger.error('Failed to upload custom emoji', err, 'EmojiUploader');
  } finally {
    client.destroy();
  }
});

client.login(token).catch(err => {
  logger.error('Client login failed', err, 'EmojiUploader');
  process.exit(1);
});
