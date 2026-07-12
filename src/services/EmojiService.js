/**
 * EmojiService — fetches, caches, and syncs custom Discord application emojis.
 * Writes a dynamic mapping dictionary to configs/emojis.json on boot.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../util/logger.js';

const emojisPath = resolve('./src/configs/emojis.json');

class EmojiService {
  constructor() {
    this.emojis = {};
    this.load();
  }

  /**
   * Loads the cached emojis from emojis.json if it exists.
   */
  load() {
    if (!existsSync(emojisPath)) {
      this.emojis = {};
      return;
    }
    try {
      this.emojis = JSON.parse(readFileSync(emojisPath, 'utf8'));
    } catch (err) {
      logger.error('Failed to read emojis config file', err, 'EmojiService');
      this.emojis = {};
    }
  }

  /**
   * Retrieves the formatted string for an emoji by name.
   * Falls back to a clean empty string if the emoji is not found.
   * @param {string} name 
   * @returns {string}
   */
  get(name) {
    return this.emojis[name] || '';
  }

  /**
   * Fetches application emojis from Discord and synchronizes them with the local JSON file.
   * Runs atomically to prevent write corruption.
   * @param {import('discord.js').Client} client 
   */
  async syncEmojis(client) {
    try {
      logger.info('Synchronizing application emojis...', 'EmojiService');
      const appEmojis = await client.application.emojis.fetch();

      const newEmojis = {};
      appEmojis.forEach(emoji => {
        newEmojis[emoji.name] = emoji.toString();
      });

      this.emojis = newEmojis;
      this.saveSync();
      logger.info(`Successfully synced ${appEmojis.size} application emojis.`, 'EmojiService');
    } catch (err) {
      logger.error('Failed to sync application emojis', err, 'EmojiService');
    }
  }

  /**
   * Writes the current emoji map to disk atomically.
   */
  saveSync() {
    const tmpPath = `${emojisPath}.tmp-${process.pid}`;
    try {
      writeFileSync(tmpPath, JSON.stringify(this.emojis, null, 2), 'utf8');
      renameSync(tmpPath, emojisPath);
      logger.debug('Saved emojis.json to disk atomically.', 'EmojiService');
    } catch (err) {
      logger.error('Failed to save emojis to disk atomically', err, 'EmojiService');
      try {
        unlinkSync(tmpPath);
      } catch (_) {}
    }
  }
}

export const emojiService = new EmojiService();
