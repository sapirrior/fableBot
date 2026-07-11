import { transaction } from '../../db/index.js';

export default {
  name: 'give',
  aliases: ['pay', 'transfer'],
  cooldown: 5000,
  description: 'Transfer coins to another user.',
  async execute(client, message, args, ctx) {
    const target = message.mentions.users.first();
    if (!target) {
      return message.reply('❓ Please mention a user to transfer coins to. Example: `f!give @user 100`');
    }

    if (target.id === message.author.id) {
      return message.reply('❌ You cannot transfer coins to yourself.');
    }

    if (target.bot) {
      return message.reply('❌ You cannot transfer coins to a bot.');
    }

    const amount = parseInt(args[1] || args[0]);
    if (isNaN(amount) || amount <= 0) {
      return message.reply('❌ Please specify a valid amount of coins to transfer.');
    }

    // Fetch author details
    const authorRow = ctx.query('getUser').get(message.author.id);
    const authorBalance = authorRow ? authorRow.balance : 0;

    if (authorBalance < amount) {
      return message.reply(`❌ You do not have enough coins! You only have **💰 ${authorBalance}** coins.`);
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
      return message.reply('❌ Database transaction failed. Transfer aborted.');
    }

    return message.reply(`💸 **|** Successfully transferred **💰 ${amount}** coins to **${target.username}**!`);
  }
};
