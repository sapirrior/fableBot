export default {
  name: 'release',
  aliases: ['rel', 'free'],
  cooldown: 3000,
  description: 'Release insects back into the wild. No Fables awarded.',
  async execute(client, message, args, ctx) {
    const { prefix } = ctx.config;
    const userId = message.author.id;

    if (!args[0]) {
      return ctx.sender.error(message, `, please specify what to release!\n> \`${prefix}release <insect|all> [amount]\``);
    }

    const targetQuery = args[0].toLowerCase();
    const rows = ctx.query('getCollection').all(userId);

    if (rows.length === 0) {
      return ctx.sender.error(message, ', your collection is empty!');
    }

    // --- Release all ---
    if (targetQuery === 'all') {
      let totalReleased = 0;
      try {
        ctx.transaction(() => {
          for (const row of rows) {
            totalReleased += row.count;
            ctx.query('removeInsect').run(userId, row.insect_id);
          }
        });
      } catch (e) {
        console.error('[release] release-all transaction failed:', e);
        return ctx.sender.error(message, ', transaction failed! Please try again.');
      }
      return ctx.sender.reply(message, '🦋', `, released **${totalReleased} insects** back to the wild.`);
    }

    // --- Release specific insect ---
    const spec = ctx.getInsect(targetQuery);
    if (!spec) {
      return ctx.sender.error(message, `, unknown insect \`${targetQuery}\`!\n> Use \`${prefix}dex\` to see all insects.`);
    }

    const row = rows.find(r => r.insect_id === spec.id);
    if (!row || row.count <= 0) {
      return ctx.sender.error(message, `, you don't have any \`${spec.id}\` to release!`);
    }

    const parsed = ctx.parse.parseAmount(args[1] ?? undefined);
    let qty = 1;
    if (args[1]) {
      if (parsed.value === 'all') {
        qty = row.count;
      } else if (parsed.error) {
        return ctx.sender.error(message, ', invalid quantity! Use a number or `all`.');
      } else {
        qty = parsed.value;
      }
    }

    if (qty > row.count) {
      return ctx.sender.error(message, `, you only have **${row.count}x** \`${spec.id}\`!`);
    }

    try {
      ctx.transaction(() => {
        if (qty >= row.count) {
          ctx.query('removeInsect').run(userId, spec.id);
        } else {
          for (let i = 0; i < qty; i++) {
            ctx.query('decrementInsect').run(userId, spec.id);
          }
        }
      });
    } catch (e) {
      console.error('[release] transaction failed:', e);
      return ctx.sender.error(message, ', transaction failed! Please try again.');
    }

    return ctx.sender.reply(message, '🦋', `, released **${qty}x** \`${spec.id}\` ${spec.emoji} back to the wild.`);
  }
};
