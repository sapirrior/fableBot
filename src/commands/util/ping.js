export default {
  name: 'ping',
  cooldown: 2000,
  description: 'Check bot API latency.',
  args: '',
  example: ['fab ping'],
  related: [],
  async execute(client, message, args, ctx) {
    const author = message.author.username;
    const sent = await message.reply(`**🏓 ● ${author}**, Pinging...`);
    const latency = sent.createdTimestamp - message.createdTimestamp;
    return sent.edit(`**🏓 ● ${author}**, Pong!\n> Latency: **${latency}ms**\n> API Latency: **${Math.round(client.ws.ping)}ms**`);
  }
};
