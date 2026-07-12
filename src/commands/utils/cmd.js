export default {
  name: 'cmd',
  aliases: [],
  cooldown: 3000,
  adminBypass: true,
  description: 'Displays detailed info on a specific command.',
  example: ['cmd help', 'cmd ping'],
  /**
   * Execute cmd command.
   * Note: Uses raw message.reply intentionally to output raw un-nested markdown block styling.
   */
  async execute(client, message, args, ctx) {
    const { prefix } = ctx.config;
    const { registry } = ctx;

    if (!args.length) {
      return ctx.sender.error(message, `, please specify a command name! Example: \`${prefix} cmd help\``);
    }

    const commandName = args[0].toLowerCase();
    const cmd = registry.get(commandName);

    if (!cmd) {
      return ctx.sender.error(message, `, could not find that command :c`);
    }

    let title = `< ${prefix} ${cmd.name} `;
    if (cmd.args) title += cmd.args + ' >';
    else title += '>';

    let aliasText = '';
    if (cmd.aliases && cmd.aliases.length > 0) {
      aliasText = '\n# Aliases\n' + cmd.aliases.join(' , ');
    }

    const descText = '\n# Description\n' + (cmd.description ?? 'No description.');

    let exampleText = '';
    if (cmd.example && cmd.example.length > 0) {
      exampleText = '\n# Example Command(s)\n';
      // format as: prefix command_example_name
      exampleText += cmd.example.map(ex => `${prefix} ${ex}`).join(' , ');
    }

    let relatedText = '';
    if (cmd.related && cmd.related.length > 0) {
      relatedText = '\n# Related Command(s)\n' + cmd.related.join(' , ');
    }

    const text = 
      '```md\n' +
      title +
      '``````md' +
      aliasText +
      descText +
      exampleText +
      relatedText +
      '``````md\n> Remove brackets when typing commands\n> [] = optional arguments\n> {} = optional user input```';

    return message.reply(text);
  }
};
