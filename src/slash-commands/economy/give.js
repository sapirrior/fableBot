import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer coins to another user.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ])
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to transfer coins to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('amount')
        .setDescription('Amount to transfer (positive integer or "all")')
        .setRequired(true)
    ),
  cooldown: 5000,
  async execute(client, interaction, ctx) {
    const senderId = interaction.user.id;
    const targetUser = interaction.options.getUser('user');
    const rawAmount = interaction.options.getString('amount');

    if (targetUser.id === senderId) {
      return ctx.sender.error(interaction, "You can't transfer coins to yourself!");
    }

    if (targetUser.bot) {
      return ctx.sender.error(interaction, "You can't transfer coins to bots!");
    }

    // Parse amount using our parse utility
    const parsed = ctx.parse.parseAmount(rawAmount);

    if (parsed.error) {
      return ctx.sender.error(interaction, 'Please specify a valid amount of coins to transfer!');
    }

    const senderDb = ctx.query('getUser').get(senderId);
    const senderBalance = senderDb?.balance ?? 0;

    let amount = parsed.value;
    if (amount === 'all') {
      amount = senderBalance;
    }

    if (amount <= 0) {
      return ctx.sender.error(interaction, 'You cannot send 0 or negative coins!');
    }

    if (senderBalance < amount) {
      return ctx.sender.error(interaction, `You do not have enough coins! You only have **${ctx.fmt(senderBalance)}**.`);
    }

    const currencyEmoji = ctx.config.currencyName || '⌬';
    const cleanUsername = targetUser.username.replace(/[*_~`|]/g, '');

    // Transaction to safely transfer the balance
    try {
      ctx.transaction(() => {
        // Upsert target user so they exist in DB
        ctx.query('upsertUser').run(targetUser.id);
        
        // Decrement sender, increment target
        ctx.query('updateUserBalance').run(-amount, senderId);
        ctx.query('updateUserBalance').run(amount, targetUser.id);
      });
    } catch (err) {
      return ctx.sender.error(interaction, 'Something went wrong with the database transaction.');
    }

    return ctx.sender.reply(interaction, {
      description: `💸 **|** You successfully transferred **${ctx.fmt(amount)} ${currencyEmoji}** to **${cleanUsername}**!`
    });
  }
};
