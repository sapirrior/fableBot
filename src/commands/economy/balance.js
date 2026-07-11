export default {
  name: 'balance',
  aliases: ['bal', 'coins'],
  cooldown: 2000,
  description: 'Show your current coin balance.',
  async execute(client, message, args, ctx) {
    // Determine target user (author or mentioned user)
    const target = message.mentions.users.first() || message.author;
    
    // Query database for target
    const row = ctx.query('getUser').get(target.id);
    const balance = row ? row.balance : 0;

    const icon = ctx.config.currencyIcon;
    const name = ctx.config.currencyName;

    if (target.id === message.author.id) {
      return message.reply(`💵 **|** You currently have **${icon} ${balance}** ${name}.`);
    } else {
      return message.reply(`💵 **|** **${target.username}** currently has **${icon} ${balance}** ${name}.`);
    }
  }
};
