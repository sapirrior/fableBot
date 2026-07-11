export default {
  name: 'profile',
  aliases: ['p'],
  cooldown: 3000,
  description: 'View your profile details.',
  async execute(client, message, args, ctx) {
    const target = message.mentions.users.first() || message.author;

    // Fetch user row
    const userRow = ctx.query('getUser').get(target.id);
    const balance = userRow ? userRow.balance : 0;
    const xp = userRow ? userRow.xp : 0;
    const level = userRow ? userRow.level : 1;

    // Fetch collection counts
    const insects = ctx.query('getCollection').all(target.id);
    const totalInsectsCaught = insects.reduce((sum, row) => sum + row.count, 0);
    const uniqueInsectsCaught = insects.length;

    // Level formula
    const xpNeeded = 100 + level * 50;

    const content = `**⌬ :: ${target.username}**'s Colony Profile\n==================================\nLevel: **${level}**\nExperience: \`${xp} / ${xpNeeded} XP\`\nColony Balance: **${balance}** ${ctx.config.currencyName}\nCollection size: **${totalInsectsCaught}** insects (\`${uniqueInsectsCaught}/20\` unique)`;

    return message.reply(content);
  }
};
