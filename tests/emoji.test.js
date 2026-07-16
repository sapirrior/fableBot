import test from 'node:test';
import assert from 'node:assert';
import { emojiService } from '../src/services/EmojiService.js';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';

test('EmojiService - synchronization and local atomic reads/writes', (t) => {
  const emojisPath = resolve('./src/configs/emojis.json');
  
  // Backup original content if exists
  let originalContent = null;
  if (existsSync(emojisPath)) {
    try {
      originalContent = readFileSync(emojisPath, 'utf8');
    } catch (_) {}
  }
  
  // Set test data to emojis object and sync to disk
  emojiService.emojis = {
    "test_logo": "<:test_logo:1234567890>",
    "blank": "<:blank:9876543210>"
  };
  
  // Write to disk
  emojiService.saveSync();
  
  assert.ok(existsSync(emojisPath), 'emojis.json config file must be written to disk');
  
  // Reload service data from disk
  emojiService.load();
  
  // Check that values matches correctly
  assert.strictEqual(emojiService.get('test_logo'), '<:test_logo:1234567890>');
  assert.strictEqual(emojiService.get('blank'), '<:blank:9876543210>');
  assert.strictEqual(emojiService.get('non_existent'), '', 'Non existent emoji should fall back to empty string');
  
  // Clean up and restore original content or initialize as empty json
  try {
    if (originalContent !== null) {
      writeFileSync(emojisPath, originalContent, 'utf8');
    } else {
      writeFileSync(emojisPath, '{}', 'utf8');
    }
  } catch (_) {}
});
