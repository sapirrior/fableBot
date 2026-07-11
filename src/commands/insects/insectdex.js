export default {
  name: 'insectdex',
  aliases: ['dex'],
  cooldown: 3000,
  description: 'Browse all available insect species and stats.',
  async execute(client, message, args, ctx) {
    let description = '';
    
    // Sort insects by value/rarity
    const sorted = [...ctx.insets].sort((a, b) => a.value - b.value);

    for (const insect of sorted) {
      description += `${insect.emoji} **${insect.name}** — Value: **${insect.value}** coins | Rarity: \`[${insect.rarity.toUpperCase()}]\`\n`;
    }

    const embed = {
      color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
      title: '📖 Fable Insectdex',
      description,
      footer: { text: 'Catch them all using f!catch!' }
    };

    return message.reply({ embeds: [embed] });
  }
};
