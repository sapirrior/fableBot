import { transaction } from '../../db/index.js';

export default {
  name: 'release',
  aliases: ['rel'],
  cooldown: 3000,
  description: 'Release insects back into the wild (no coins awarded).',
  async execute(client, message, args, ctx) {
    if (!args[0]) {
      return message.reply('❓ Please specify an insect to release. Example: `f!release ant 1` or `f!release all` to release everything.');
    }

    const userId = message.author.id;
    const targetQuery = args[0].toLowerCase();

    // Fetch user collection
    const collectionRows = ctx.query('getCollection').all(userId);
    if (collectionRows.length === 0) {
      return message.reply('🪹 Your collection is empty! Nothing to release.');
    }

    // Option 1: Release all
    if (targetQuery === 'all') {
      let totalReleased = 0;
      try {
        transaction(() => {
          for (const row of collectionRows) {
            totalReleased += row.count;
            ctx.query('removeInsect').run(userId, row.insect_id);
          }
        });
      } catch (dbError) {
        console.error('[DatabaseSync] Release-all transaction failed:', dbError);
        return message.reply('❌ Failed to release insects due to a database error.');
      }
      return message.reply(`🦋 **|** You released all **${totalReleased}** insects back to the wild!`);
    }

    // Option 2: Release specific insect
    const spec = ctx.insets.find(i => i.id === targetQuery || i.name.toLowerCase() === targetQuery);
    if (!spec) {
      return message.reply(`❌ Unknown insect species: "${targetQuery}".`);
    }

    const userQuantityRow = collectionRows.find(r => r.insect_id === spec.id);
    if (!userQuantityRow || userQuantityRow.count <= 0) {
      return message.reply(`❌ You do not have any **${spec.name}** in your collection.`);
    }

    let quantityToRelease = 1;
    if (args[1]) {
      if (args[1].toLowerCase() === 'all') {
        quantityToRelease = userQuantityRow.count;
      } else {
        quantityToRelease = parseInt(args[1]);
        if (isNaN(quantityToRelease) || quantityToRelease <= 0) {
          return message.reply('❌ Please specify a valid quantity to release.');
        }
      }
    }

    if (quantityToRelease > userQuantityRow.count) {
      return message.reply(`❌ You only have **${userQuantityRow.count}** **${spec.name}**.`);
    }

    try {
      transaction(() => {
        if (quantityToRelease === userQuantityRow.count) {
          ctx.query('removeInsect').run(userId, spec.id);
        } else {
          for (let i = 0; i < quantityToRelease; i++) {
            ctx.query('decrementInsect').run(userId, spec.id);
          }
        }
      });
    } catch (dbError) {
      console.error('[DatabaseSync] Release transaction failed:', dbError);
      return message.reply('❌ FAILED to release insects.');
    }

    return message.reply(`🦋 **|** You released **${quantityToRelease}x ${spec.name}** back to the wild!`);
  }
};
