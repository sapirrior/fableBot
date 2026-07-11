const COLORS = {
  reset: '\x1b[0m',
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
  debug: '\x1b[36m', // cyan
  time: '\x1b[90m'   // gray
};

function formatTime() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

export const logger = {
  info(msg, tag = 'Dan') {
    const time = formatTime();
    console.log(`${COLORS.time}[${time}]${COLORS.reset} ${COLORS.info}[INFO]${COLORS.reset} [${tag}] ${msg}`);
  },

  warn(msg, tag = 'Dan') {
    const time = formatTime();
    console.warn(`${COLORS.time}[${time}]${COLORS.reset} ${COLORS.warn}[WARN]${COLORS.reset} [${tag}] ${msg}`);
  },

  error(msg, err = null, tag = 'Dan') {
    const time = formatTime();
    let displayMsg = msg;
    let stack = '';

    if (err) {
      if (err instanceof Error) {
        displayMsg = `${msg} - ${err.message}`;
        stack = err.stack || '';
      } else {
        displayMsg = `${msg} - ${String(err)}`;
      }
    }

    console.error(`${COLORS.time}[${time}]${COLORS.reset} ${COLORS.error}[ERROR]${COLORS.reset} [${tag}] ${displayMsg}`);
    if (stack) {
      console.error(COLORS.error + stack + COLORS.reset);
    }
  },

  debug(msg, tag = 'Dan') {
    const time = formatTime();
    console.log(`${COLORS.time}[${time}]${COLORS.reset} ${COLORS.debug}[DEBUG]${COLORS.reset} [${tag}] ${msg}`);
  }
};
