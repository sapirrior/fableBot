import { COLORS } from '../util/colors.js';

export default {
  name: 'messageCreate',
  once: false,

  /**
   * Executes the messageCreate event listener.
   * Checks if the bot was mentioned and replies with a clean Fable onboarding embed.
   */
  async execute(client, message) {
    if (message.author.bot) return;

    // Check if the bot is @mentioned directly (and not via everyone/here)
    if (message.mentions.has(client.user) && !message.mentions.everyone) {
      const embed = {
        color: COLORS.BRAND,
        description: `Hey **${message.author.username}**! To start playing Fable, make sure you authorize me to your account by clicking the **Add to My Apps** button on my profile.\n\nOnce authorized, try running \`/help\` to explore the commands or \`/rules\` to learn the gameplay rules!`,
        footer: {
          text: `Begin your journey today · Run /help to get started`
        }
      };

      try {
        await message.reply({ embeds: [embed] });
      } catch (err) {
        // Safe catch in case bot lacks send/reply permissions in the channel
      }
    }
  }
};
