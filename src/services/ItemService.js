import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../util/logger.js';

const itemsPath = resolve('./src/configs/items.json');

/**
 * Service to manage shop items config data (items.json).
 * Handles loading, retrieving, and query operations for nets and baits.
 */
class ItemService {
  constructor() {
    this.items = [];
    this.load();
  }

  /**
   * Loads the items from configurations.
   */
  load() {
    try {
      const raw = JSON.parse(readFileSync(itemsPath, 'utf8'));
      this.items = raw.items || [];
    } catch (err) {
      logger.error('Failed to load items config data', err, 'ItemService');
      this.items = [];
    }
  }

  /**
   * Returns all items.
   * @returns {object[]} Array of all item definitions.
   */
  getAll() {
    return this.items;
  }

  /**
   * Retrieves an item by its ID.
   * @param {string} id - The ID of the item.
   * @returns {object|null} The item object or null if not found.
   */
  getItem(id) {
    if (!id) return null;
    return this.items.find(item => item.id === id) || null;
  }

  /**
   * Returns items sorted by category then price for shop display.
   * @returns {object[]} Sorted items.
   */
  getShopItems() {
    return [...this.items].sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.price - b.price;
    });
  }

  /**
   * Reloads the items configurations dynamically.
   */
  reload() {
    this.load();
    logger.info('Item definitions reloaded successfully.', 'ItemService');
  }
}

export const itemService = new ItemService();
