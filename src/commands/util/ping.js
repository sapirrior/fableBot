export default {
  name: 'ping',
  aliases: ['pong'],
  cooldown: 3000,
  description: 'Check bot latency and Discord API ping.',
  async execute(client, message, args, ctx) {
    // OwO ping format: 🏓 **|** ...pong! In 45ms
    // Fable adapted:   🏓 **●** Pong! `45ms` · API `12ms`
    const sent = await message.reply('🏓 **●** Pinging...');
    const latency = sent.createdTimestamp - message.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);
    await sent.edit(`🏓 **●** Pong! \`${latency}ms\` · API \`${apiPing}ms\``);
  }
};
