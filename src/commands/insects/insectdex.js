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
      description += `> ${insect.emoji} \`${insect.id}\` :: Value: **${insect.value}** ${ctx.config.currencyName} | \`[${insect.rarity.toUpperCase()}]\`\n`;
    }

    const embed = {
      color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
      title: '📖 **::** Fable Insectdex Node',
      description: `==================================\n${description}`,
      footer: { text: `Query command: ${ctx.config.prefix}catch` }
    };

    return message.reply({ embeds: [embed] });
  }
};
