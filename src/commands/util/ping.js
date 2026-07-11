export default {
  name: 'ping',
  cooldown: 2000,
  description: 'Check bot API latency.',
  async execute(client, message, args, ctx) {
    const sent = await message.reply('🏓 Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    return sent.edit(`🏓 Pong! Latency: **${latency}ms** | API Latency: **${Math.round(client.ws.ping)}ms**`);
  }
};
