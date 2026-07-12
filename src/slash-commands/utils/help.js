import { SlashCommandBuilder, ApplicationIntegrationType, InteractionContextType } from 'discord.js';
import { CATEGORY_META } from '../../configs/categories.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Displays the list of slash commands.')
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

    const grouped = {};
    for (const cmd of uniqueCmds) {
      const cat = cmd.category || 'utils';
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(`\`/${cmd.data.name}\``);
    }

    const fields = Object.keys(grouped)
      .map(cat => ({
        key: cat,
        name: CATEGORY_META[cat]?.name ?? `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
        value: grouped[cat].join('  '),
        order: CATEGORY_META[cat]?.order ?? 99
      }))
      .sort((a, b) => a.order - b.order)
      .map(({ name, value }) => ({ name, value, inline: false }));

    const embedData = {
      author: {
        name: 'Command List',
        icon_url: interaction.user.displayAvatarURL({ size: 64 })
      },
      description: 'Here is the list of slash commands! Use them anywhere by user-installing Fable.',
      fields
    };

    // Help menu is sent ephemerally to keep channel hygiene
    return ctx.sender.reply(interaction, embedData, true);
  }
};
