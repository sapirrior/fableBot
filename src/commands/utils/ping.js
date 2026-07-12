export default {
  name: 'ping',
  aliases: ['pong'],
  cooldown: 5000,
  description: 'Shows the bot latency in milliseconds.',
  example: ['ping'],
  /** 
   * Execute ping command.
   * Note: Uses raw message.reply intentionally to match the unique latency output layout.
   */
  async execute(client, message, args, ctx) {
    const apiPing = Math.round(client.ws.ping);
    return message.reply(`🏓 **|** ...pong! In **${apiPing}ms**`);
  }
};
