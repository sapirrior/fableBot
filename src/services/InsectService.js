/**
 * Service to manage insects config data (insets.json).
 * Handles loading, querying, and rolling mechanics using Tier-First pools.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../util/logger.js';

const insetsPath = resolve('./src/configs/insets.json');

class InsectService {
  constructor() {
    this.ranks = {};
    this.pools = {};
    this.flatInsets = [];
    this.load();
  }

  load() {
    try {
      const raw = JSON.parse(readFileSync(insetsPath, 'utf8'));
      this.ranks = raw.ranks || {};
      this.pools = raw.pools || {};

      // Build flat representation for backward compatibility lookup queries
      const flat = [];
      for (const [rankName, list] of Object.entries(this.pools)) {
        for (const insect of list) {
          flat.push({
            ...insect,
            rarity: rankName
          });
        }
      }
      this.flatInsets = flat;
    } catch (err) {
      logger.error('Failed to load insets config data', err, 'InsectService');
      this.ranks = {};
      this.pools = {};
      this.flatInsets = [];
    }
  }

  /**
   * Returns a flat array of all insect definitions.
   * @returns {object[]}
   */
  getAll() {
    return this.flatInsets;
  }

  /**
   * Looks up an insect by ID or name (case-insensitive).
   * @param {string} id
   * @returns {object|null}
   */
  getById(id) {
    if (!id) return null;
    const search = id.toLowerCase();
    return this.flatInsets.find(
      i => i.id === search || i.name.toLowerCase() === search
    ) || null;
  }

  /**
   * Performs a Tier-First roll to select a random insect:
   *   1. Roll a rarity tier using rank weights.
   *   2. Pick a random insect from that tier's pool.
   * @returns {object} Rolled insect object
   */
  rollInsect() {
    const ranks = Object.keys(this.ranks);
    if (!ranks.length) {
      throw new Error('[InsectService] No ranks configured to roll from!');
    }

    // Cumulative weight selection for rarity tier
    const totalRarity = Object.values(this.ranks).reduce((sum, r) => sum + (r.rarity || 0), 0);
    const rand = Math.random() * totalRarity;

    let selectedRank = 'common';
    let runningSum = 0;
    for (const [rankName, rankMeta] of Object.entries(this.ranks)) {
      runningSum += rankMeta.rarity || 0;
      if (rand <= runningSum) {
        selectedRank = rankName;
        break;
      }
    }

    const pool = this.pools[selectedRank] || [];
    if (!pool.length) {
      // Fallback in case a configured rank pool is empty
      const flatCommon = this.pools['common'] || [];
      return { ...flatCommon[Math.floor(Math.random() * flatCommon.length)], rarity: 'common' };
    }

    const insect = pool[Math.floor(Math.random() * pool.length)];
    return {
      ...insect,
      rarity: selectedRank
    };
  }

  reload() {
    this.load();
    logger.info('Insect definitions reloaded successfully.', 'InsectService');
  }
}

export const insectService = new InsectService();
