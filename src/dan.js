/**
 * Thin bot lifecycle orchestrator (dan.js).
 * delegates startup sequence to Bootstrap and cleanup to Shutdown.
 */
import { bootstrap } from './core/Bootstrap.js';
import { shutdown } from './core/Shutdown.js';

export class Dan {
  constructor() {
    this.client = null;
  }

  async start() {
    this.client = await bootstrap();
  }

  destroy() {
    shutdown(this.client);
  }
}
