export default {
  name: 'ping',
  aliases: ['pong'],
  cooldown: 5000,
  description: 'Shows the bot latency in milliseconds.',
  example: ['ping'],
  async execute(client, message, args, ctx) {
    const sent = await message.reply('🏓 **|** ...pinging!');
    const ping = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);
    return sent.edit(`🏓 **|** ...pong! In **${ping}ms** (API: **${apiPing}ms**)`);
  }
};
