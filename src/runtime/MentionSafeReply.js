/**
 * Utility helper that wraps Discord messages to suppress reply mention pings.
 * @param {Message} message
 */
export function applyMentionSafeReply(message) {
  const originalReply = message.reply.bind(message);
  
  message.reply = function (options) {
    if (typeof options === 'string') {
      return originalReply({ content: options, allowedMentions: { repliedUser: false } });
    } else if (typeof options === 'object' && options !== null) {
      options.allowedMentions = { ...options.allowedMentions, repliedUser: false };
      return originalReply(options);
    }
    return originalReply(options);
  };
}
