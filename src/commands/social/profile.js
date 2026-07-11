export default {
  name: 'profile',
  aliases: ['p', 'me'],
  cooldown: 5000,
  description: 'View your colony profile: level, XP, balance, and collection stats.',
  async execute(client, message, args, ctx) {
    const target = ctx.parse.parseUser(message) ?? message.author;
    const userRow = ctx.query('getUser').get(target.id);

    const balance = userRow?.balance ?? 0;
    const xp = userRow?.xp ?? 0;
    const level = userRow?.level ?? 1;
    const createdAt = userRow?.created_at ?? Math.floor(Date.now() / 1000);
    const streak = userRow?.daily_streak ?? 0;

    const xpNeeded = 100 + level * 50;
    const insects = ctx.query('getCollection').all(target.id);
    const totalCount = insects.reduce((s, r) => s + r.count, 0);
    const uniqueCount = insects.length;

    const memberSince = new Date(createdAt * 1000).toISOString().split('T')[0];

    return ctx.sender.embed(message, {
      author: {
        name: `🪲 ${target.username}'s Colony Profile`,
        icon_url: target.displayAvatarURL({ size: 64 }),
      },
      thumbnail: { url: target.displayAvatarURL({ size: 128 }) },
      color: ctx.constants.RARITY_COLORS.rare,
      fields: [
        { name: '⭐ Level',      value: `${level}`,                           inline: true },
        { name: '✨ XP',        value: `${ctx.fmt(xp)} / ${ctx.fmt(xpNeeded)}`, inline: true },
        { name: '💵 Fables',    value: ctx.fmt(balance),                      inline: true },
        { name: '🌿 Collection',value: `${ctx.fmt(totalCount)} insects`,       inline: true },
        { name: '📖 Unique',    value: `${uniqueCount} / 20`,                  inline: true },
        { name: '🔥 Streak',    value: `${streak} days`,                       inline: true },
      ],
      footer: { text: `Colony established ${memberSince}` },
      timestamp: new Date().toISOString(),
    });
  }
};
