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

  /**
   * Computes the level, title, and current progression based on total XP.
   * @param {number} xp - The user's total XP.
   * @returns {object} Level metadata: { level, currentXp, nextLevelXp, title, emoji }
   */
  computeLevel(xp) {
    if (xp < 0) xp = 0;
    let level = 1;
    if (xp > 0) {
      level = Math.floor(Math.pow(xp / 120, 1 / 1.8)) + 1;
      if (level < 1) level = 1;
    }

    const currentMinXp = level === 1 ? 0 : Math.floor(Math.pow(level - 1, 1.8) * 120);
    const nextLevelTargetXp = Math.floor(Math.pow(level, 1.8) * 120);

    const titles = [
      { min_level: 1,   title: "Novice Catcher",          emoji: "🪱" },
      { min_level: 6,   title: "Apprentice Entomologist",  emoji: "🦗" },
      { min_level: 12,  title: "Insect Enthusiast",        emoji: "🐌" },
      { min_level: 20,  title: "Skilled Collector",        emoji: "🪲" },
      { min_level: 30,  title: "Expert Tracker",           emoji: "🐜" },
      { min_level: 45,  title: "Master Catcher",           emoji: "🦋" },
      { min_level: 60,  title: "Grand Entomologist",       emoji: "🦂" },
      { min_level: 80,  title: "Lord of the Swarm",        emoji: "🐝" },
      { min_level: 100, title: "Celestial Warden",         emoji: "✨" },
      { min_level: 150, title: "Astral Hunter",            emoji: "☄️" },
      { min_level: 200, title: "Void Walker",              emoji: "🌑" },
      { min_level: 300, title: "Cosmos Monarch",           emoji: "🌌" },
      { min_level: 500, title: "Keeper of the Eternal Hive", emoji: "👑" }
    ];

    let activeTitle = titles[0];
    for (const title of titles) {
      if (level >= title.min_level) {
        activeTitle = title;
      }
    }

    return {
      level,
      currentXp: xp - currentMinXp,
      nextLevelXp: nextLevelTargetXp - currentMinXp,
      totalXpNeeded: nextLevelTargetXp,
      title: activeTitle.title,
      emoji: activeTitle.emoji
    };
  }

  /**
   * Calculates the sell value of an insect based on the quantity owned.
   * Uses logarithmic scaling for duplicate bonuses.
   * @param {object} insect - The insect configuration.
   * @param {number} count - The count of duplicate insects currently owned.
   * @returns {number} The final calculated sell value.
   */
  computeSellValue(insect, count) {
    const baseValue = insect.base_value || insect.value || 5;
    if (count <= 1) return baseValue;
    const multiplier = 1 + 0.12 * Math.log2(count + 1);
    return Math.floor(baseValue * multiplier);
  }
}

export const insectService = new InsectService();
