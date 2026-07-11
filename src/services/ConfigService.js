import { readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../util/logger.js';

const configPath = resolve('./src/configs/config.json');

class ConfigManager {
  constructor() {
    this.config = {};
    this.writeTimeout = null;
    this.load();
  }

  load() {
    try {
      this.config = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (err) {
      logger.error('Failed to read config file', err, 'ConfigManager');
      this.config = {
        prefix: 'sudo',
        embedColor: '#000000',
        cooldownSweepIntervalMs: 300000,
        dailyCooldownMs: 79200000,
        dailyRewardCoins: 250,
        catchCooldownMs: 10000,
        currencyName: '⌬',
        statusMessage: '? butterflies'
      };
    }
  }

  get(key) {
    return this.config[key];
  }

  getAll() {
    return { ...this.config };
  }

  set(key, value) {
    this.config[key] = value;
    this.queueSave();
  }

  queueSave() {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    // Debounce disk writes by 500ms to prevent multiple rapid I/O operations
    this.writeTimeout = setTimeout(() => {
      this.saveSync();
    }, 500);
  }

  saveSync() {
    const tmpPath = `${configPath}.tmp-${process.pid}`;
    try {
      writeFileSync(tmpPath, JSON.stringify(this.config, null, 2), 'utf8');
      renameSync(tmpPath, configPath);
      logger.info('Saved configuration to disk atomically.', 'ConfigManager');
    } catch (err) {
      logger.error('Failed to save config to disk atomically', err, 'ConfigManager');
      try {
        unlinkSync(tmpPath);
      } catch (_) {}
    } finally {
      this.writeTimeout = null;
    }
  }

  flush() {
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
      this.writeTimeout = null;
      this.saveSync();
    }
  }
}

export const configManager = new ConfigManager();
export const config = configManager.getAll(); // for backward compatibility/quick access
