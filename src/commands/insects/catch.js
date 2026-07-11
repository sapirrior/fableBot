import { transaction } from '../../db/index.js';

export default {
  name: 'catch',
  aliases: ['c', 'hunt'],
  cooldown: 10000, // 10 seconds (loaded from config)
  description: 'Catch a random insect in the wild to collect it and gain experience.',
  args: '',
  example: ['fab catch'],
  related: ['fab collection', 'fab sell'],
  async execute(client, message, args, ctx) {
    const userId = message.author.id;
    const author = message.author.username;
    const insects = ctx.insets;

    // 1. Calculate weighted pool
    const pool = [];
    for (const insect of insects) {
      for (let i = 0; i < insect.weight; i++) {
        pool.push(insect);
      }
    }

    if (pool.length === 0) {
      return message.reply(`[❌] **${author}** :: System error!\n> No insects found in the configuration.`);
    }

    // 2. Select random insect
    const selected = pool[Math.floor(Math.random() * pool.length)];

    // XP gained based on rarity
    let xpGained = 15;
    if (selected.rarity === 'uncommon') xpGained = 25;
    else if (selected.rarity === 'rare') xpGained = 50;
    else if (selected.rarity === 'epic') xpGained = 100;
    else if (selected.rarity === 'legendary') xpGained = 250;

    let leveledUp = false;
    let newLevel = 1;

    try {
      transaction(() => {
        // Record insect in collection
        ctx.query('catchInsect').run(userId, selected.id);

        // Fetch user data
        const userRow = ctx.query('getUser').get(userId);
        let xp = userRow.xp + xpGained;
        let level = userRow.level;

        // Check level up
        let xpNeeded = 100 + level * 50;
        if (xp >= xpNeeded) {
          while (xp >= xpNeeded) {
            xp -= xpNeeded;
            level++;
            xpNeeded = 100 + level * 50;
          }
          leveledUp = true;
          newLevel = level;
        }

        // Save new xp and level
        ctx.query('updateUserXP').run(xp, level, userId);
      });
    } catch (dbError) {
      console.error('[DatabaseSync] Catch transaction failed:', dbError);
      return message.reply(`[❌] **${author}** :: Database transaction failed.\n> Failed to record your catch.`);
    }

    let response = `[⌬] **${author}** :: Caught a \`${selected.id}\` ${selected.emoji}!\n> Experience generated: **+${xpGained} XP**`;
    if (leveledUp) {
      response += `\n> Level up: reached Level **${newLevel}**! 🎉`;
    }

    return message.reply(response);
  }
};
