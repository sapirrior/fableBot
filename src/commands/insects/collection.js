export default {
  name: 'collection',
  aliases: ['col', 'bag'],
  cooldown: 3000,
  description: 'View your insect collection.',
  async execute(client, message, args, ctx) {
    const target = message.mentions.users.first() || message.author;
    const author = message.author.username;
    
    // Fetch user collection
    const collectionRows = ctx.query('getCollection').all(target.id);
    if (collectionRows.length === 0) {
      const resp = target.id === message.author.id
        ? `[❌] **${author}** :: Query empty!\n> Your collection is empty! Start catching using \`${ctx.config.prefix}catch\`.`
        : `[❌] **${author}** :: Query empty!\n> **${target.username}** has no insects in their collection yet.`;
      return message.reply(resp);
    }

    // Map rows to config definitions
    let description = '';
    for (const row of collectionRows) {
      const spec = ctx.insets.find(i => i.id === row.insect_id);
      if (spec) {
        description += `> ${spec.emoji} \`${spec.id}\` (x${row.count}) :: \`[${spec.rarity.toUpperCase()}]\`\n`;
      }
    }

    const embed = {
      color: parseInt(ctx.config.embedColor.replace('#', ''), 16),
      title: `[📖] ${target.username}'s Colony Collection`,
      description: `==================================\n${description}`,
      timestamp: new Date()
    };

    return message.reply({ embeds: [embed] });
  }
};
