/**
 * Centralized message sender utility.
 * 
 * Fable adapted format:
 * 
 *   **${emoji} | ${username}**${content}
 */

/**
 * Sends a standard bold-prefix reply.
 * Produces: **EMOJI | username**, content...
 * 
 * @param {Message} message  - Discord message object (with patched reply)
 * @param {string}  emoji    - Status emoji e.g. '💵'
 * @param {string}  content  - Text after bold block, starts with ", " e.g. ", you have **250 Fables**!"
 */
export function reply(message, emoji, content) {
  const name = message.author.username;
  return message.reply(`**${emoji} | ${name}**${content}`);
}

/**
 * Sends a standard error reply.
 * Produces: **❌ | username**, content...
 * 
 * @param {Message} message
 * @param {string}  content - Error text, starts with ", " e.g. ", not enough Fables!"
 */
export function error(message, content) {
  const name = message.author.username;
  return message.reply(`**❌ | ${name}**${content}`);
}

/**
 * Sends a rich embed reply with consistent structure.
 * Automatically converts hex color strings (#RRGGBB) to integers.
 * 
 * @param {Message} message
 * @param {Object}  opts    - Discord embed data (title, description, fields, author, footer, color, thumbnail)
 */
export function embed(message, opts) {
  let color = opts.color;
  if (typeof color === 'string') {
    color = parseInt(color.replace('#', ''), 16);
  }
  return message.reply({ embeds: [{ ...opts, color }] });
}
