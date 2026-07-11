import { transaction } from '../../db/index.js';

export default {
  name: 'sell',
  cooldown: 3000,
  description: 'Sell caught insects for currency.',
  async execute(client, message, args, ctx) {
    const name = ctx.config.currencyName;
    const prefix = ctx.config.prefix;
    const author = message.author.username;

    if (!args[0]) {
      return message.reply(`[❌] **${author}** :: Missing target identifier!\n> Please specify an insect to sell. Example: \`${prefix}sell ant 1\` or \`${prefix}sell all\``);
    }

    const userId = message.author.id;
    const targetQuery = args[0].toLowerCase();

    // Fetch user's current collection
    const collectionRows = ctx.query('getCollection').all(userId);
    if (collectionRows.length === 0) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> Your collection is empty! Nothing to sell.`);
    }

    // Option 1: Sell all
    if (targetQuery === 'all') {
      let totalCoinsGained = 0;
      let totalSold = 0;

      try {
        transaction(() => {
          for (const row of collectionRows) {
            const spec = ctx.insets.find(i => i.id === row.insect_id);
            if (spec) {
              const coinsGained = spec.value * row.count;
              totalCoinsGained += coinsGained;
              totalSold += row.count;

              // Remove from collection
              ctx.query('removeInsect').run(userId, row.insect_id);
            }
          }
          // Update user balance
          ctx.query('updateUserBalance').run(totalCoinsGained, userId);
        });
      } catch (dbError) {
        console.error('[DatabaseSync] Sell-all transaction failed:', dbError);
        return message.reply(`[❌] **${author}** :: Database transaction failed.\n> FAILED to sell insects due to a database error.`);
      }

      return message.reply(`[💵] **${author}** :: Successfully sold **${totalSold}** insects!\n> ${name} generated: **+${totalCoinsGained} ${name}**`);
    }

    // Option 2: Sell specific insect
    const spec = ctx.insets.find(i => i.id === targetQuery || i.name.toLowerCase() === targetQuery);
    if (!spec) {
      return message.reply(`[❌] **${author}** :: Unknown insect species: "${targetQuery}"!\n> Use \`${prefix}insectdex\` to view valid insects.`);
    }

    const userQuantityRow = collectionRows.find(r => r.insect_id === spec.id);
    if (!userQuantityRow || userQuantityRow.count <= 0) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> You do not have any \`${spec.id}\` in your collection.`);
    }

    // Determine quantity to sell
    let quantityToSell = 1;
    if (args[1]) {
      if (args[1].toLowerCase() === 'all') {
        quantityToSell = userQuantityRow.count;
      } else {
        quantityToSell = parseInt(args[1]);
        if (isNaN(quantityToSell) || quantityToSell <= 0) {
          return message.reply(`[❌] **${author}** :: Transaction failed!\n> Please specify a valid quantity to sell.`);
        }
      }
    }

    if (quantityToSell > userQuantityRow.count) {
      return message.reply(`[❌] **${author}** :: Transaction failed!\n> You only have **${userQuantityRow.count}** \`${spec.id}\`.`);
    }

    const totalReward = spec.value * quantityToSell;

    try {
      transaction(() => {
        if (quantityToSell === userQuantityRow.count) {
          // Sell all of this insect - remove row
          ctx.query('removeInsect').run(userId, spec.id);
        } else {
          // Decrement count in db
          for (let i = 0; i < quantityToSell; i++) {
            ctx.query('decrementInsect').run(userId, spec.id);
          }
        }
        // Add coins to balance
        ctx.query('updateUserBalance').run(totalReward, userId);
      });
    } catch (dbError) {
      console.error('[DatabaseSync] Sell transaction failed:', dbError);
      return message.reply(`[❌] **${author}** :: Database transaction failed.\n> FAILED to execute sell order.`);
    }

    return message.reply(`[💵] **${author}** :: Successfully sold **${quantityToSell}x** \`${spec.id}\` ${spec.emoji}!\n> ${name} generated: **+${totalReward} ${name}**`);
  }
};
