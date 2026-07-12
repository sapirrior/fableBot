import { 
  SlashCommandBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  StringSelectMenuOptionBuilder,
  ApplicationIntegrationType, 
  InteractionContextType 
} from 'discord.js';
import { CATEGORY_META } from '../../configs/categories.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays a list of available commands with category navigation.')
    .setIntegrationTypes([
      ApplicationIntegrationType.GuildInstall,
      ApplicationIntegrationType.UserInstall
    ])
    .setContexts([
      InteractionContextType.Guild,
      InteractionContextType.BotDM,
      InteractionContextType.PrivateChannel
    ]),
  cooldown: 3000,
  async execute(client, interaction, ctx) {
    const { registry } = ctx;
    const uniqueCmds = Array.from(new Set(registry.values()));

    // Helper to format commands list for a specific category using the requested example.txt style:
    // **/command**
    // -# description
    const formatCategoryCommands = (catName) => {
      const filtered = uniqueCmds.filter(cmd => (cmd.category || 'utils') === catName);
      if (!filtered.length) return 'No commands registered in this category.';
      return filtered.map(cmd => `**/${cmd.data.name}**\n-# ${cmd.data.description}`).join('\n\n');
    };

    // 1. Build Select Menu dropdown components
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('📂 Choose a command category...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Economy')
          .setDescription('View currency, daily rewards, and transactions.')
          .setEmoji('💰')
          .setValue('economy'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Gambling')
          .setDescription('Risk your coins in coinflips.')
          .setEmoji('🎰')
          .setValue('gambling'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Utility')
          .setDescription('View status, latency, avatar, and guide commands.')
          .setEmoji('🔧')
          .setValue('utils')
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Default Embed view (overview of categories)
    const grouped = {};
    for (const cmd of uniqueCmds) {
      const cat = cmd.category || 'utils';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(`\`/${cmd.data.name}\``);
    }

    const fields = Object.keys(grouped)
      .map(cat => ({
        name: CATEGORY_META[cat]?.name ?? `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: grouped[cat].join('  '),
        order: CATEGORY_META[cat]?.order ?? 99
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ name, value }) => ({ name, value, inline: false }));

    const defaultEmbed = {
      author: {
        name: 'Fable Command Index',
        icon_url: interaction.user.displayAvatarURL({ size: 64 })
      },
      description: `Welcome to Fable! Run slash commands (/) anywhere.\n\nUse the dropdown below to explore specific command groups and descriptions.`,
      fields
    };

    // 2. Send the non-ephemeral response with dropdown components
    const response = await interaction.reply({
      embeds: [{ ...defaultEmbed, color: parseInt((ctx.config.embedColor || '6D3CCF').replace('#', ''), 16) }],
      components: [row],
      fetchReply: true
    });

    // 3. Collect StringSelectMenu selection interactions locally
    const collector = response.createMessageComponentCollector({
      filter: (i) => i.customId === 'help_category_select' && i.user.id === interaction.user.id,
      time: 60000 // 1 minute timeout
    });

    collector.on('collect', async (menuInteraction) => {
      const selectedCategory = menuInteraction.values[0];
      const meta = CATEGORY_META[selectedCategory] || { name: selectedCategory };

      const categoryDescription = formatCategoryCommands(selectedCategory);

      const updatedEmbed = {
        author: {
          name: `${meta.name} Commands`,
          icon_url: interaction.user.displayAvatarURL({ size: 64 })
        },
        description: `Use slash commands (/) for a faster experience!\n\n${categoryDescription}`,
        color: parseInt((ctx.config.embedColor || '6D3CCF').replace('#', ''), 16)
      };

      // Acknowledge choice and update the embed, keeping select menu active
      await menuInteraction.update({
        embeds: [updatedEmbed],
        components: [row]
      });
    });

    collector.on('end', async () => {
      // Disable select menu dropdown when timeout is reached
      const disabledRow = new ActionRowBuilder().addComponents(
        StringSelectMenuBuilder.from(selectMenu).setDisabled(true).setPlaceholder('Menu expired. Run /help again.')
      );
      try {
        await interaction.editReply({
          components: [disabledRow]
        });
      } catch (err) {
        // Safe catch in case message was deleted
      }
    });
  }
};
