import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { COLORS } from '../../util/colors.js';

export default {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coins to another user.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall,
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel,
    ])
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('The user to transfer coins to')
        .setRequired(true),
    )
    .addStringOption(opt =>
      opt.setName('amount')
        .setDescription('Amount to transfer (number or "all")')
        .setRequired(true),
    ),
  cooldown: 5000,
  async execute(client, interaction, ctx) {
    const senderId   = interaction.user.id;
    const targetUser = interaction.options.getUser('user');
    const rawAmount  = interaction.options.getString('amount');

    if (targetUser.id === senderId) {
      return ctx.sender.error(interaction, "You can't transfer coins to yourself.");
    }
    if (targetUser.bot) {
      return ctx.sender.error(interaction, "You can't transfer coins to bots.");
    }

    const parsed = ctx.parse.parseAmount(rawAmount);
    if (parsed.error) {
      return ctx.sender.error(interaction, 'Please provide a valid amount (e.g. `500` or `all`).');
    }

    // Defer early — transaction + two DB reads could approach the 3s window
    await ctx.sender.defer(interaction);

    const senderDb      = ctx.query('getUser').get(senderId);
    const senderBalance = senderDb?.balance ?? 0;

    let amount = parsed.value === 'all' ? senderBalance : parsed.value;

    if (amount <= 0) {
      return ctx.sender.error(interaction, 'You cannot send 0 or negative coins.');
    }
    if (senderBalance < amount) {
      return ctx.sender.error(
        interaction,
        `You only have **${ctx.config.currencyName || '⌬'} ${ctx.fmt(senderBalance)}** — not enough to send **${ctx.config.currencyName || '⌬'} ${ctx.fmt(amount)}**.`,
      );
    }

    const currency = ctx.config.currencyName || '⌬';

    try {
      ctx.transaction(() => {
        ctx.query('upsertUser').run(targetUser.id);
        ctx.query('updateUserBalance').run(-amount, senderId);
        ctx.query('updateUserBalance').run(amount, targetUser.id);
      });
    } catch {
      return ctx.sender.error(interaction, 'Something went wrong with the transfer. No coins were moved.');
    }

    const newBalance = senderBalance - amount;

    return ctx.sender.reply(interaction, {
      color: COLORS.MINT,
      description: `Sent **${currency} ${ctx.fmt(amount)}** to **${targetUser.username}**.`,
      footer: { text: `Your balance: ${currency} ${ctx.fmt(newBalance)}` },
    });
  },
};
