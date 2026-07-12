import { randomInt } from 'node:crypto';

const maxBet = 250000;

export default {
  name: 'coinflip',
  aliases: ['cf', 'coin', 'flip'],
  cooldown: 5000,
  description: 'Flip a coin and gamble your coins! Choose heads (h) or tails (t).',
  args: '<heads|tails> <amount|all>',
  example: ['coinflip heads 50', 'cf t all'],
  async execute(client, message, args, ctx) {
    const authorId = message.author.id;

    // Syntax check - need at least 2 arguments (choice and bet)
    if (args.length < 2) {
      return ctx.sender.error(
        message, 
        ', invalid arguments! Example: `coinflip heads 50` or `cf t all`.'
      );
    }

    // Resolve user choice
    let choice = args[0].toLowerCase();
    if (['heads', 'h', 'head'].includes(choice)) {
      choice = 'h';
    } else if (['tails', 't', 'tail'].includes(choice)) {
      choice = 't';
    } else {
      // In case they put the amount first, check swap
      let swapChoice = args[1].toLowerCase();
      if (['heads', 'h', 'head'].includes(swapChoice)) {
        choice = 'h';
      } else if (['tails', 't', 'tail'].includes(swapChoice)) {
        choice = 't';
      } else {
        return ctx.sender.error(message, ', you must choose either `heads` or `tails`!');
      }
    }

    // Resolve bet amount
    const rawAmountArg = choice === args[0].toLowerCase() ? args[1] : args[0];
    const parsed = ctx.parse.parseAmount(rawAmountArg);

    if (parsed.error) {
      return ctx.sender.error(message, ', please specify a valid amount of coins to bet!');
    }

    // Get user's balance
    const dbUser = ctx.query('getUser').get(authorId);
    const balance = dbUser?.balance ?? 0;

    let bet = parsed.value;
    if (bet === 'all') {
      bet = balance;
    }

    if (bet > maxBet) {
      bet = maxBet;
    }

    if (bet <= 0) {
      return ctx.sender.error(message, ', you cannot bet 0 or negative coins!');
    }

    if (balance < bet) {
      return ctx.sender.error(
        message, 
        `, you do not have enough coins! You only have **${ctx.fmt(balance)} ${ctx.config.currencyName || '⌬'}**.`
      );
    }

    // Get production emoji wrappers
    const coinflipEmoji = ctx.emoji('coinflip') || '🪙';
    const blankEmoji = ctx.emoji('blank') || ' ';
    const currencyName = ctx.config.currencyName || '⌬';

    // Perform cryptographically secure coin flip (0 = tails, 1 = heads)
    const resultSide = randomInt(0, 2); // returns 0 or 1
    const choseHeads = choice === 'h';
    const won = (resultSide === 1 && choseHeads) || (resultSide === 0 && !choseHeads);

    // Apply outcome inside transaction
    ctx.transaction(() => {
      ctx.query('updateUserBalance').run(won ? bet : -bet, authorId);
    });

    const sideText = resultSide === 1 ? 'heads' : 'tails';
    const cleanUsername = message.author.username.replace(/[*_~`|]/g, '');

    // Step 1: Send spinning coin message
    const msgRef = await ctx.sender.reply(
      message,
      '🪙',
      `, you bet **${ctx.fmt(bet)} ${currencyName}** and chose **${choseHeads ? 'heads' : 'tails'}**...\n${blankEmoji} **|** The coin spins... ${coinflipEmoji}`
    );

    // Step 2: Edit after 2 seconds to show result
    setTimeout(async () => {
      try {
        if (won) {
          const newBalance = balance + bet;
          await msgRef.edit(
            `**🪙 | ${cleanUsername}**, you bet **${ctx.fmt(bet)} ${currencyName}** and chose **${choseHeads ? 'heads' : 'tails'}**...\n` +
            `${blankEmoji} **|** The coin landed on **${sideText}**! You won **${ctx.fmt(bet * 2)} ${currencyName}**! (New Balance: **${ctx.fmt(newBalance)}**)`
          );
        } else {
          const newBalance = balance - bet;
          await msgRef.edit(
            `**🪙 | ${cleanUsername}**, you bet **${ctx.fmt(bet)} ${currencyName}** and chose **${choseHeads ? 'heads' : 'tails'}**...\n` +
            `${blankEmoji} **|** The coin landed on **${sideText}**! You lost it all... :c (New Balance: **${ctx.fmt(newBalance)}**)`
          );
        }
      } catch (err) {
        // Safe catch in case user deletes message before edit fires
      }
    }, 2000);
  }
};
