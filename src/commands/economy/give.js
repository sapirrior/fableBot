import { transaction } from '../../db/index.js';

export default {
  name: 'give',
  aliases: ['pay', 'transfer'],
  cooldown: 5000,
  description: 'Transfer currency to another user.',
  async execute(client, message, args, ctx) {
    const name = ctx.config.currencyName;
    const prefix = ctx.config.prefix;
    const author = message.author.username;

    const target = message.mentions.users.first();
    if (!target) {
      return message.reply(`[❌] **${author}** :: Missing target identifier!\n> Please mention a user to transfer ${name} to. Example: \`${prefix}give @user 100\``);
    }

    if (target.id === message.author.id) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> You cannot transfer ${name} to yourself.`);
    }

    if (target.bot) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> You cannot transfer ${name} to a bot.`);
    }

    const amount = parseInt(args[1] || args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> Please specify a valid amount of ${name} to transfer.`);
    }

    // Fetch author details
    const authorRow = ctx.query('getUser').get(message.author.id);
    const authorBalance = authorRow ? authorRow.balance : 0;

    if (authorBalance < amount) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> You do not have enough ${name}! You only have **${authorBalance}** ${name}.`);
    }

    // Perform transfer within database transaction
    try {
      transaction(() => {
        // Ensure target user row exists
        ctx.query('upsertUser').run(target.id);
        
        // Deduct from author, credit target
        ctx.query('updateUserBalance').run(-amount, message.author.id);
        ctx.query('updateUserBalance').run(amount, target.id);
      });
    } catch (dbError) {
      console.error('[DatabaseSync] Transfer failed:', dbError);
      return message.reply(`[❌] **${author}** :: Database transaction failed. Transfer aborted.`);
    }

    return message.reply(`[💸] **${author}** :: Transfer successful!\n> Transferred **${amount}** ${name} to **${target.username}**`);
  }
};
