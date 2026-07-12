import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { randomInt } from 'node:crypto';

const maxBet = 250000;

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and gamble your coins! Choose heads or tails.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ])
    .addStringOption(option =>
      option.setName('choice')
        .setDescription('Choose heads or tails')
        .setRequired(true)
        .addChoices(
          { name: 'heads', value: 'h' },
          { name: 'tails', value: 't' }
        )
    )
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount to bet (positive integer or "all")')
        .setRequired(true)
    ),
  cooldown: 5000,
  async execute(client, interaction, ctx) {
    const authorId = interaction.user.id;
    const choice = interaction.options.getString('choice');
    const rawAmountArg = interaction.options.getString('amount');

    // Resolve bet amount
    const parsed = ctx.parse.parseAmount(rawAmountArg);

    if (parsed.error) {
      return ctx.sender.error(interaction, 'Please specify a valid amount of coins to bet!');
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
      return ctx.sender.error(interaction, 'You cannot bet 0 or negative coins!');
    }

    if (balance < bet) {
      return ctx.sender.error(
        interaction, 
        `You do not have enough coins! You only have **${ctx.fmt(balance)} ${ctx.config.currencyName || '⌬'}**.`
      );
    }

    // Get custom application emojis or fallbacks
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
    const cleanUsername = interaction.user.username.replace(/[*_~`|]/g, '');

    // Step 1: Send spinning coin message (non-ephemeral by default)
    await ctx.sender.reply(interaction, {
      description: `🪙 **|** You bet **${ctx.fmt(bet)} ${currencyName}** and chose **${choseHeads ? 'heads' : 'tails'}**...\n${blankEmoji} **|** The coin spins... ${coinflipEmoji}`
    });

    // Step 2: Edit after 2 seconds to show result
    setTimeout(async () => {
      try {
        if (won) {
          const newBalance = balance + bet;
          await interaction.editReply({
            embeds: [{
              color: ctx.sender.reply.color, // uses base embed color
              description: `**🪙 | ${cleanUsername}**, you bet **${ctx.fmt(bet)} ${currencyName}** and chose **${choseHeads ? 'heads' : 'tails'}**...\n` +
                `${blankEmoji} **|** The coin landed on **${sideText}**! You won **${ctx.fmt(bet * 2)} ${currencyName}**! (New Balance: **${ctx.fmt(newBalance)}**)`
            }]
          });
        } else {
          const newBalance = balance - bet;
          await interaction.editReply({
            embeds: [{
              color: ctx.sender.reply.color, // uses base embed color
              description: `**🪙 | ${cleanUsername}**, you bet **${ctx.fmt(bet)} ${currencyName}** and chose **${choseHeads ? 'heads' : 'tails'}**...\n` +
                `${blankEmoji} **|** The coin landed on **${sideText}**! You lost it all... :c (New Balance: **${ctx.fmt(newBalance)}**)`
            }]
          });
        }
      } catch (err) {
        // Safe catch in case message was deleted or interaction expired
      }
    }, 2000);
  }
};
