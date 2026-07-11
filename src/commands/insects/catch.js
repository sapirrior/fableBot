export default {
  name: 'catch',
  aliases: ['c', 'hunt'],
  cooldown: 10000,
  description: 'Hunt for insects in the wild! Rarer insects give more XP.',
  async execute(client, message, args, ctx) {
    const userId = message.author.id;
    const { insets } = ctx;

    // Build weighted pool
    const pool = [];
    for (const insect of insets) {
      for (let i = 0; i < insect.weight; i++) pool.push(insect);
    }
    if (pool.length === 0) {
      return ctx.sender.error(message, ', no insects are configured! Tell the admin!');
    }

    const selected = pool[Math.floor(Math.random() * pool.length)];

    // XP by rarity
    const XP_MAP = { common: 15, uncommon: 25, rare: 50, epic: 100, legendary: 250 };
    const xpGained = XP_MAP[selected.rarity] ?? 15;

    let leveledUp = false;
    let newLevel = 1;

    try {
      ctx.transaction(() => {
        ctx.query('catchInsect').run(userId, selected.id);

        const userRow = ctx.query('getUser').get(userId);
        let xp = (userRow?.xp ?? 0) + xpGained;
        let level = userRow?.level ?? 1;

        let xpNeeded = 100 + level * 50;
        while (xp >= xpNeeded) {
          xp -= xpNeeded;
          level++;
          xpNeeded = 100 + level * 50;
          leveledUp = true;
        }
        newLevel = level;
        ctx.query('updateUserXP').run(xp, level, userId);
      });
    } catch (e) {
      console.error('[catch] Transaction failed:', e);
      return ctx.sender.error(message, ', something went wrong while catching! Try again.');
    }

    const rarityLabel = ctx.constants.capitalize(selected.rarity);
    let text = ` went hunting and caught a **${rarityLabel}** \`${selected.id}\` ${selected.emoji}!\n> ✨ **+${xpGained} XP** gained!`;
    if (leveledUp) text += `\n> 🎉 Level up! Now **Level ${newLevel}**!`;

    return ctx.sender.reply(message, '🌿', text);
  }
};
