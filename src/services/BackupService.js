/**
 * BackupService — compresses the database file in-memory using node:zlib
 * and sends it as an attachment to a configured Discord channel on a schedule.
 *
 * Zero temp files. Zero extra dependencies. Uses only Node stdlib + discord.js.
 */
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { AttachmentBuilder } from 'discord.js';
import { logger } from '../util/logger.js';
import { configManager } from './ConfigService.js';
import { checkpoint } from '../db/index.js';
import { COLORS } from '../util/colors.js';

const DB_PATH = resolve('./src/db/database/fable_data.db');

class BackupService {
  constructor() {
    this._interval = null;
  }

  /**
   * Starts the scheduled backup loop. Fires once immediately on start,
   * then repeats every `backupIntervalMs` milliseconds.
   * @param {import('discord.js').Client} client
   */
  start(client) {
    this.stop();

    // Only run backups if environment is explicitly set to PRODUCTION
    if (process.env.ENV !== 'PRODUCTION') {
      logger.info('Skipping backup scheduler initialization (not in PRODUCTION mode).', 'BackupService');
      return;
    }

    const intervalMs = configManager.get('backupIntervalMs') || 21600000;

    // Run once immediately so the first backup doesn't wait a full interval
    this.runBackup(client).catch(() => {});

    this._interval = setInterval(() => {
      this.runBackup(client).catch((err) => {
        logger.error('Unhandled error in backup interval', err, 'BackupService');
      });
    }, intervalMs);

    // Unref so the interval never blocks graceful process exit
    this._interval.unref();

    logger.info(`Backup scheduler started. Interval: ${intervalMs}ms`, 'BackupService');
  }

  /**
   * Stops the backup scheduler and clears the interval.
   */
  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
      logger.info('Backup scheduler stopped.', 'BackupService');
    }
  }

  /**
   * Performs a single backup cycle:
   *   1. WAL checkpoint (flush pending writes into the main .db file)
   *   2. Read the database file into a Buffer
   *   3. Gzip-compress the Buffer in memory (level 9)
   *   4. Send as a Discord attachment with a detailed stats embed
   *
   * @param {import('discord.js').Client} client
   * @returns {Promise<void>}
   */
  async runBackup(client) {
    const channelId = configManager.get('backupChannelId');
    if (!channelId?.trim()) {
      logger.warn('backupChannelId is not configured. Skipping backup.', 'BackupService');
      return;
    }

    const channel = client.channels.cache.get(channelId);
    if (!channel?.isTextBased()) {
      logger.warn(`Backup channel "${channelId}" not found in cache or is not a text channel.`, 'BackupService');
      return;
    }

    try {
      // 1. Flush WAL into main file for a consistent file-level snapshot
      checkpoint();

      // 2. Read the database file into memory
      const rawBuffer = await readFile(DB_PATH);
      const originalSize = rawBuffer.length;

      // 3. Compress in memory — level 9 for maximum compression ratio
      const compressed = gzipSync(rawBuffer, { level: 9 });
      const compressedSize = compressed.length;
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

      // 4. Build file attachment and embed
      const now = new Date();
      const isoTs = now.toISOString();
      const fileTs = isoTs.replace(/[:.]/g, '-').slice(0, 19); // safe filename chars
      const filename = `fable_backup_${fileTs}Z.db.gz`;

      const attachment = new AttachmentBuilder(compressed, { name: filename });

      const color = COLORS.BRAND;

      const unixSeconds = Math.floor(now.getTime() / 1000);

      const embed = {
        author: {
          name: 'Database Backup'
        },
        description: `Scheduled snapshot of \`fable_data.db\` — compressed in memory and ready to restore.`,
        color,
        fields: [
          {
            name: 'File',
            value: `\`${filename}\``,
            inline: false
          },
          {
            name: 'Original',
            value: `\`${this._formatBytes(originalSize)}\``,
            inline: true
          },
          {
            name: 'Compressed',
            value: `\`${this._formatBytes(compressedSize)}\``,
            inline: true
          },
          {
            name: 'Saved',
            value: `\`${ratio}%\``,
            inline: true
          },
          {
            name: 'Timestamp',
            value: `<t:${unixSeconds}:F> (<t:${unixSeconds}:R>)`,
            inline: false
          }
        ],
        footer: {
          text: 'Fable BackupService'
        },
        timestamp: now.toISOString()
      };

      await channel.send({ embeds: [embed], files: [attachment] });

      logger.info(
        `Backup sent to #${channel.name} — ` +
        `${this._formatBytes(originalSize)} → ${this._formatBytes(compressedSize)} (${ratio}% saved)`,
        'BackupService'
      );
    } catch (err) {
      logger.error('Failed to create or send database backup', err, 'BackupService');
    }
  }

  /**
   * Formats a byte count into a human-readable string.
   * @param {number} bytes
   * @returns {string}
   */
  _formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

export const backupService = new BackupService();
