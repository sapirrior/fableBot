export default {
  name: 'ping',
  aliases: ['pong'],
  cooldown: 5000,
  description: 'Shows the bot latency in milliseconds.',
  async execute(client, message, args, ctx) {
    const sent = await message.reply('🏓 **|** ...pinging!');
    const ping = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);
    await sent.edit(`🏓 **|** ...pong! In **${ping}ms** (API: **${apiPing}ms**)`);
  }
};
