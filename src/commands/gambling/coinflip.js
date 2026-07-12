import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { randomInt } from 'node:crypto';
import { COLORS } from '../../util/colors.js';

const MAX_BET = 250_000;

export default {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and gamble your coins.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .addStringOption(opt =>
      opt.setName('choice')
        .setDescription('heads or tails')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'h' },
          { name: 'Tails', value: 't' },
        ),
    )
    .addStringOption(opt =>
      opt.setName('amount')
        .setDescription('Amount to bet (number or "all")')
        .setRequired(true),
    ),
  cooldown: 5000,

  async execute(client, interaction, ctx) {
    const userId   = interaction.user.id;
    const choice   = interaction.options.getString('choice');
    const currency = ctx.config.currencyName || '⌬';
    const parsed   = ctx.parse.parseAmount(interaction.options.getString('amount'));

    if (parsed.error) {
      return ctx.sender.error(interaction, 'Please provide a valid bet amount (e.g. `500` or `all`).');
    }

    const dbUser  = ctx.query('getUser').get(userId);
    const balance = dbUser?.balance ?? 0;

    let bet = parsed.value === 'all' ? balance : parsed.value;
    if (bet > MAX_BET) bet = MAX_BET;

    if (bet <= 0) {
      return ctx.sender.error(interaction, 'You need at least **1 coin** to flip.');
    }
    if (balance < bet) {
      return ctx.sender.error(
        interaction,
        `You only have **${ctx.fmt(balance)} ${currency}** — not enough to bet **${ctx.fmt(bet)}**.`,
      );
    }

    const choseHeads = choice === 'h';
    const choiceStr  = choseHeads ? 'heads' : 'tails';

    // Cryptographically secure flip (0 = tails, 1 = heads)
    const resultSide = randomInt(0, 2);
    const won        = (resultSide === 1) === choseHeads;
    const resultStr  = resultSide === 1 ? 'heads' : 'tails';

    ctx.transaction(() => ctx.query('updateUserBalance').run(won ? bet : -bet, userId));
    const newBalance = won ? balance + bet : balance - bet;

    // Initial "spinning" embed
    await ctx.sender.reply(interaction, {
      color: COLORS.SOFT,
      description: `You bet **${ctx.fmt(bet)} ${currency}** on **${choiceStr}** — the coin is in the air...`,
    });

    // Reveal after 2 s
    setTimeout(async () => {
      try {
        const color = won ? COLORS.GOLD : COLORS.ROSE;
        const outcome = won
          ? `The coin landed **${resultStr}**. You won **+${ctx.fmt(bet)} ${currency}**.`
          : `The coin landed **${resultStr}**. You lost **−${ctx.fmt(bet)} ${currency}**.`;

        await interaction.editReply({
          embeds: [{
            color,
            description: `You bet **${ctx.fmt(bet)} ${currency}** on **${choiceStr}** — ${outcome}`,
            footer: { text: `Balance: ${ctx.fmt(newBalance)} ${currency}` },
          }],
        });
      } catch { /* message deleted or interaction expired */ }
    }, 2000);
  },
};
