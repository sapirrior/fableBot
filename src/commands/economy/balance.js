export default {
  name: 'balance',
  aliases: ['bal', 'money', 'coins', 'cash'],
  cooldown: 3000,
  description: "Check your own or another user's coin balance.",
  args: '[user]',
  example: ['balance', 'balance @user'],
  async execute(client, message, args, ctx) {
    const targetUser = ctx.parse.parseUser(message) || message.author;
    
    // Ensure target user is upserted in the database
    ctx.query('upsertUser').run(targetUser.id);
    
    const dbUser = ctx.query('getUser').get(targetUser.id);
    const balance = dbUser?.balance ?? 0;
    const currencyEmoji = ctx.config.currencyName || '⌬';

    const cleanUsername = targetUser.username.replace(/[*_~`|]/g, '');

    if (targetUser.id === message.author.id) {
      return ctx.sender.reply(
        message, 
        '💵', 
        `, you have **${ctx.fmt(balance)} ${currencyEmoji}**`
      );
    } else {
      return ctx.sender.reply(
        message, 
        '💵', 
        `, **${cleanUsername}** has **${ctx.fmt(balance)} ${currencyEmoji}**`
      );
    }
  }
};
