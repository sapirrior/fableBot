/**
 * Service to manage insects config data (insets.json).
 * Handles loading, querying, and reload capabilities.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { logger } from '../util/logger.js';

const insetsPath = resolve('./src/configs/insets.json');

class InsectService {
  constructor() {
    this.insets = [];
    this.load();
  }

  load() {
    try {
      this.insets = JSON.parse(readFileSync(insetsPath, 'utf8'));
    } catch (err) {
      logger.error('Failed to load insets config data', err, 'InsectService');
      this.insets = [];
    }
  }

  getAll() {
    return this.insets;
  }

  getById(id) {
    if (!id) return null;
    const search = id.toLowerCase();
    return this.insets.find(
      i => i.id === search || i.name.toLowerCase() === search
    );
  }

  reload() {
    this.load();
    logger.info('Insect definitions reloaded successfully.', 'InsectService');
  }
}

export const insectService = new InsectService();
export default insectService;
