const cooldowns = new Map();

/**
 * Checks if a user is on cooldown for a specific command.
 * @param {string} userId 
 * @param {string} commandName 
 * @param {number} cooldownMs 
 * @returns {number} Remaining cooldown time in ms, or 0 if not on cooldown.
 */
export function checkCooldown(userId, commandName, cooldownMs) {
  const key = `${userId}:${commandName}`;
  const now = Date.now();
  const expiresAt = cooldowns.get(key) ?? 0;

  if (now < expiresAt) {
    return expiresAt - now;
  }

  cooldowns.set(key, now + cooldownMs);
  return 0;
}

/**
 * Starts a sweeper to clean up expired cooldowns periodically.
 * @param {number} intervalMs 
 */
export function startCooldownSweeper(intervalMs = 300000) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, expiresAt] of cooldowns.entries()) {
      if (expiresAt <= now) {
        cooldowns.delete(key);
      }
    }
  }, intervalMs).unref(); // unref so it doesn't block process exit
}
