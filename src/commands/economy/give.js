export default {
  name: 'give',
  aliases: ['pay', 'send', 'transfer'],
  cooldown: 5000,
  description: 'Transfer coins to another user.',
  args: '<@user> <amount|all>',
  example: ['give @user 50', 'give @user all'],
  async execute(client, message, args, ctx) {
    const senderId = message.author.id;
    const targetUser = ctx.parse.parseUser(message);

    if (!targetUser) {
      return ctx.sender.error(message, ', please mention a valid user to transfer coins to! Example: `give @user 50`');
    }

    if (targetUser.id === senderId) {
      return ctx.sender.error(message, ", you can't transfer coins to yourself!");
    }

    if (targetUser.bot) {
      return ctx.sender.error(message, ", you can't transfer coins to bots!");
    }

    // Parse amount using our parse utility
    // We check both args[0] and args[1] in case they mention the user first or the amount first
    const rawAmountArg = ctx.parse.parseUser(message)?.id === args[0]?.replace(/[<@!>]/g, '') ? args[1] : args[0];
    const parsed = ctx.parse.parseAmount(rawAmountArg);

    if (parsed.error) {
      return ctx.sender.error(message, ', please specify a valid amount of coins to transfer!');
    }

    const senderDb = ctx.query('getUser').get(senderId);
    const senderBalance = senderDb?.balance ?? 0;

    let amount = parsed.value;
    if (amount === 'all') {
      amount = senderBalance;
    }

    if (amount <= 0) {
      return ctx.sender.error(message, ', you cannot send 0 or negative coins!');
    }

    if (senderBalance < amount) {
      return ctx.sender.error(message, `, you do not have enough coins! You only have **${ctx.fmt(senderBalance)}**.`);
    }

    const currencyEmoji = ctx.config.currencyName || '⌬';
    const cleanUsername = targetUser.username.replace(/[*_~`|]/g, '');

    // Transaction to safely transfer the balance
    try {
      ctx.transaction(() => {
        // Upsert target user so they exist in DB
        ctx.query('upsertUser').run(targetUser.id);
        
        // Decrement sender, increment target
        ctx.query('updateUserBalance').run(-amount, senderId);
        ctx.query('updateUserBalance').run(amount, targetUser.id);
      });
    } catch (err) {
      return ctx.sender.error(message, ', something went wrong with the database transaction.');
    }

    return ctx.sender.reply(
      message,
      '💸',
      `, you successfully transferred **${ctx.fmt(amount)} ${currencyEmoji}** to **${cleanUsername}**!`
    );
  }
};
