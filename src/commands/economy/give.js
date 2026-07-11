export default {
  name: 'give',
  aliases: ['pay', 'transfer'],
  cooldown: 5000,
  description: 'Send Fables to another user.',
  async execute(client, message, args, ctx) {
    const { currencyName, prefix } = ctx.config;

    const target = ctx.parse.parseUser(message);
    if (!target) {
      return ctx.sender.error(message, `, please mention a user to send to!\n> Example: \`${prefix}give @user 100\``);
    }
    if (target.id === message.author.id) {
      return ctx.sender.error(message, `, you can't send ${currencyName} to yourself!`);
    }
    if (target.bot) {
      return ctx.sender.error(message, `, you can't send ${currencyName} to a bot!`);
    }

    // Find amount in args (any position that is a valid integer)
    const amountStr = args.find(a => /^\d+$/.test(a));
    const parsed = ctx.parse.parseAmount(amountStr);
    if (parsed.error || parsed.value === 'all') {
      return ctx.sender.error(message, `, please provide a valid amount!\n> Example: \`${prefix}give @user 100\``);
    }
    const amount = parsed.value;

    const authorRow = ctx.query('getUser').get(message.author.id);
    const balance = authorRow?.balance ?? 0;
    if (balance < amount) {
      return ctx.sender.error(message, `, not enough ${currencyName}! You only have **${ctx.fmt(balance)}**!`);
    }

    try {
      ctx.transaction(() => {
        ctx.query('upsertUser').run(target.id);
        ctx.query('updateUserBalance').run(-amount, message.author.id);
        ctx.query('updateUserBalance').run(amount, target.id);
      });
    } catch (e) {
      console.error('[give] Transaction failed:', e);
      return ctx.sender.error(message, `, transfer failed! Please try again.`);
    }

    return ctx.sender.reply(message, '💸', ` sent **${ctx.fmt(amount)} ${currencyName}** to **${target.username}**!`);
  }
};
