import { readFileSync } from 'fs';
import { resolve } from 'path';
import { registry } from './commandHandler.js';
import { checkCooldown } from '../util/cooldown.js';
import { query, transaction } from '../db/index.js';
import * as sender from '../util/sender.js';
import * as constants from '../util/constants.js';
import * as parse from '../util/parse.js';

// Load static configs once at startup
const config = JSON.parse(readFileSync(resolve('./src/configs/config.json'), 'utf8'));
const insets = JSON.parse(readFileSync(resolve('./src/configs/insets.json'), 'utf8'));

export function onMessageCreate(client, message) {
  // Ignore bots, webhooks, and Direct Messages
  if (message.author.bot || !message.guild) return;

  // Patch reply() to globally suppress mention pings (allowedMentions)
  const originalReply = message.reply.bind(message);
  message.reply = function (options) {
    if (typeof options === 'string') {
      return originalReply({ content: options, allowedMentions: { repliedUser: false } });
    } else if (typeof options === 'object' && options !== null) {
      options.allowedMentions = { ...options.allowedMentions, repliedUser: false };
      return originalReply(options);
    }
    return originalReply(options);
  };

  const content = message.content.trim();
  const prefix = config.prefix;
  const mentionPrefix = `<@${client.user.id}>`;
  const mentionNickPrefix = `<@!${client.user.id}>`;

  let commandText = '';
  const lowerContent = content.toLowerCase();
  const lowerPrefix = prefix.toLowerCase();

  // Resolve prefix or bot mention trigger
  if (lowerContent.startsWith(lowerPrefix)) {
    commandText = content.slice(prefix.length).trim();
  } else if (content.startsWith(mentionPrefix)) {
    commandText = content.slice(mentionPrefix.length).trim();
  } else if (content.startsWith(mentionNickPrefix)) {
    commandText = content.slice(mentionNickPrefix.length).trim();
  } else {
    return;
  }

  if (!commandText) return;

  // Parse command name and args
  const args = commandText.split(/ +/g);
  const commandName = args.shift().toLowerCase();

  // Look up command
  const cmd = registry.get(commandName);
  if (!cmd) return;

  // Ensure user exists in database
  try {
    query('upsertUser').run(message.author.id);
  } catch (e) {
    console.error(`[DB] Failed to upsert user ${message.author.id}:`, e);
    return;
  }

  // Cooldown check
  const cooldownMs = cmd.cooldown ?? 3000;
  const cooldownLeft = checkCooldown(message.author.id, cmd.name, cooldownMs);
  if (cooldownLeft > 0) {
    const waitSec = (cooldownLeft / 1000).toFixed(1);
    message.reply(`⏳ **● ${message.author.username}**, slow down! Wait **${waitSec}s** for \`${cmd.name}\`.`)
      .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000))
      .catch(() => {});
    return;
  }

  // Build rich context bundle passed to every command
  const ctx = {
    config,
    insets,
    query,
    transaction,
    sender,
    constants,
    parse,
    fmt: (n) => Number(n).toLocaleString('en-US'),
    getInsect: (id) => insets.find(i =>
      i.id === id.toLowerCase() || i.name.toLowerCase() === id.toLowerCase()
    ),
  };

  // Execute command with structured error recovery
  cmd.execute(client, message, args, ctx).catch((err) => {
    console.error(`[${cmd.name}] Unhandled error:`, err);
    sender.error(message, ', something went wrong! Please try again.');
  });
}
