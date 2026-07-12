/**
 * Factory class/helper resolving dynamic execution contexts for commands
 * by querying the ServiceContainer dynamically.
 */
import { container } from '../core/ServiceContainer.js';
import * as sender from '../util/sender.js';
import * as constants from '../util/constants.js';
import * as parse from '../util/parse.js';
import { query, transaction } from '../db/index.js';
import { registry } from '../handlers/commandHandler.js';

/**
 * Resolves the dynamic execution context for commands.
 * @returns {object} Context bundle object.
 */
export function buildContext() {
  const configService = container.resolve('config');
  const insectService = container.resolve('insects');

  return {
    get config() {
      return configService.getAll();
    },
    get insets() {
      return insectService.getAll();
    },
    query,
    transaction,
    sender,
    constants,
    parse,
    registry,
    fmt: (n) => Number(n).toLocaleString('en-US'),
    getInsect: (id) => insectService.getById(id),
    rollInsect: () => insectService.rollInsect()
  };
}
