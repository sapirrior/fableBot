import { transaction } from '../../db/index.js';

export default {
  name: 'release',
  aliases: ['rel'],
  cooldown: 3000,
  description: 'Release insects back into the wild (no Fables awarded).',
  async execute(client, message, args, ctx) {
    const author = message.author.username;
    const prefix = ctx.config.prefix;

    if (!args[0]) {
      return message.reply(`**❌ ● ${author}**, Missing target identifier!\n> Please specify an insect to release. Example: \`${prefix}release ant 1\` or \`${prefix}release all\``);
    }

    const userId = message.author.id;
    const targetQuery = args[0].toLowerCase();

    // Fetch user collection
    const collectionRows = ctx.query('getCollection').all(userId);
    if (collectionRows.length === 0) {
      return message.reply(`**❌ ● ${author}**, Transaction failed!\n> Your collection is empty! Nothing to release.`);
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
        return message.reply(`**❌ ● ${author}**, Database transaction failed.\n> Failed to release insects due to a database error.`);
      }
      return message.reply(`**🦋 ● ${author}**, Release successful!\n> Released **${totalReleased}** insects back to the wild.`);
    }

    // Option 2: Release specific insect
    const spec = ctx.insets.find(i => i.id === targetQuery || i.name.toLowerCase() === targetQuery);
    if (!spec) {
      return message.reply(`**❌ ● ${author}**, Unknown insect species: "${targetQuery}"!`);
    }

    const userQuantityRow = collectionRows.find(r => r.insect_id === spec.id);
    if (!userQuantityRow || userQuantityRow.count <= 0) {
      return message.reply(`**❌ ● ${author}**, Transaction failed!\n> You do not have any \`${spec.id}\` in your collection.`);
    }

    let quantityToRelease = 1;
    if (args[1]) {
      if (args[1].toLowerCase() === 'all') {
        quantityToRelease = userQuantityRow.count;
      } else {
        quantityToRelease = parseInt(args[1]);
        if (isNaN(quantityToRelease) || quantityToRelease <= 0) {
          return message.reply(`**❌ ● ${author}**, Transaction failed!\n> Please specify a valid quantity to release.`);
        }
      }
    }

    if (quantityToRelease > userQuantityRow.count) {
      return message.reply(`**❌ ● ${author}**, Transaction failed!\n> You only have **${userQuantityRow.count}** \`${spec.id}\`.`);
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
      return message.reply(`**❌ ● ${author}**, Database transaction failed.\n> FAILED to release insects.`);
    }

    return message.reply(`**🦋 ● ${author}**, Release successful!\n> Released **${quantityToRelease}x** \`${spec.id}\` ${spec.emoji} back to the wild.`);
  }
};
