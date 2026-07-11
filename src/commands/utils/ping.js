export default {
  name: 'ping',
  aliases: ['pong'],
  cooldown: 5000,
  description: 'Shows the bot latency in milliseconds.',
  example: ['ping'],
  async execute(client, message, args, ctx) {
    const apiPing = Math.round(client.ws.ping);
    return message.reply(`🏓 **|** ...pong! In **${apiPing}ms**`);
  }
};
