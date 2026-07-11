export default {
  name: 'balance',
  aliases: ['bal', 'coins'],
  cooldown: 2000,
  description: 'Check your or another user\'s Fables balance.',
  async execute(client, message, args, ctx) {
    const target = ctx.parse.parseUser(message) ?? message.author;
    const row = ctx.query('getUser').get(target.id);
    const balance = row ? row.balance : 0;
    const name = ctx.config.currencyName;

    if (target.id === message.author.id) {
      return ctx.sender.reply(message, '💵', `, you have **${ctx.fmt(balance)} ${name}**!`);
    }
    return ctx.sender.reply(message, '💵', ` **${target.username}** has **${ctx.fmt(balance)} ${name}**!`);
  }
};
