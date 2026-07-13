/**
 * BlackjackService — in-memory session store + all game logic for /blackjack.
 *
 * Sessions are keyed by userId. Each session holds the live deck, hands, and
 * bet so button-click interactions can resume the correct game state.
 * A self-sweeping interval evicts sessions older than SESSION_TTL to prevent leaks.
 */
import { randomInt } from 'node:crypto';
import { logger } from '../util/logger.js';
import { COLORS } from '../util/colors.js';

// Result → embed color mapping
const RESULT_COLOR = {
  playing: COLORS.BRAND,
  win:     COLORS.GOLD,
  bj:      COLORS.GOLD,
  lose:    COLORS.ROSE,
  tie:     COLORS.SLATE,
  bust:    COLORS.SLATE,
};

// ─── Session store ───────────────────────────────────────────────────────────
const SESSION_TTL_MS   = 3 * 60 * 1000;  // 3 min inactivity → evict
const SWEEP_INTERVAL   = 5 * 60 * 1000;  // sweep every 5 min

/** @type {Map<string, object>} */
const sessions = new Map();

/**
 * Starts the background sweep timer. Call once from Bootstrap.js.
 */
export function startBlackjackSweeper() {
  const t = setInterval(() => {
    const now = Date.now();
    let n = 0;
    for (const [id, s] of sessions) {
      if (s.done || now - s.ts > SESSION_TTL_MS) { sessions.delete(id); n++; }
    }
    if (n) logger.info(`Swept ${n} stale blackjack session(s).`, 'BlackjackService');
  }, SWEEP_INTERVAL);
  t.unref?.();
}

// ─── Card helpers ────────────────────────────────────────────────────────────
// Cards 1-52: rank = (card-1)%13  (0=A,1-8=2-9,9=10,10=J,11=Q,12=K)
//             suit = Math.floor((card-1)/13)  (0=♠,1=♣,2=♥,3=♦)

const SUIT_BASE = [0x1F0A0, 0x1F0D0, 0x1F0B0, 0x1F0C0]; // ♠♣♥♦ Unicode blocks
const RANK_OFF  = [1,2,3,4,5,6,7,8,9,10,11,12,13];       // A 2…9 10 J Q K
const FULL_DECK = Array.from({ length: 52 }, (_, i) => i + 1);

/** Unicode playing-card emoji for a card number 1-52. */
function emoji(card) {
  return String.fromCodePoint(SUIT_BASE[Math.floor((card - 1) / 13)] + RANK_OFF[(card - 1) % 13]);
}

/** Draw one random card from a deck array (mutates). */
function draw(deck) { return deck.splice(randomInt(0, deck.length), 1)[0]; }

/**
 * Best blackjack value for a hand.
 * @param {number[]} hand
 * @returns {{ points: number, soft: boolean }}
 */
export function handValue(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    const r = (c - 1) % 13;
    if (r === 0) { aces++; total += 11; }
    else total += r >= 9 ? 10 : r + 1;
  }
  let soft = aces > 0;
  while (total > 21 && aces-- > 0) total -= 10;
  if (aces <= 0) soft = false;
  return { points: total, soft };
}

/** True when a 2-card hand totals 21. */
function isNatural(hand) { return hand.length === 2 && handValue(hand).points === 21; }

// ─── Session CRUD ────────────────────────────────────────────────────────────

/** @returns {boolean} */
export function hasSession(userId) {
  const s = sessions.get(userId);
  return !!s && !s.done;
}

/**
 * Creates a fresh session for the user. Overwrites any previous done session.
 * @param {string} userId
 * @param {number} bet
 * @returns {object} session
 */
export function createSession(userId, bet) {
  const deck = FULL_DECK.slice();
  const session = {
    playerHand: [draw(deck), draw(deck)],
    dealerHand: [draw(deck), draw(deck)],
    deck,
    bet,
    done: false,
    ts: Date.now(),
  };
  sessions.set(userId, session);
  return session;
}

/** @returns {object|null} */
export function getSession(userId) { return sessions.get(userId) ?? null; }

/** Marks session as done and schedules removal on next sweep. */
export function endSession(userId) {
  const s = sessions.get(userId);
  if (s) s.done = true;
}

// ─── Game actions ────────────────────────────────────────────────────────────

/**
 * Player draws one card. Touch timestamp to reset TTL.
 * @param {string} userId
 * @returns {object} updated session
 */
export function hit(userId) {
  const s = sessions.get(userId);
  if (!s || s.done) throw new Error(`[BlackjackService] hit() called with no active session for ${userId}`);
  s.playerHand.push(draw(s.deck));
  s.ts = Date.now();
  return s;
}

/**
 * Dealer plays out (hit until ≥17). Marks session done.
 * @param {string} userId
 * @returns {object} settled session
 */
export function dealerPlay(userId) {
  const s = sessions.get(userId);
  if (!s || s.done) throw new Error(`[BlackjackService] dealerPlay() called with no active session for ${userId}`);
  while (handValue(s.dealerHand).points < 17) s.dealerHand.push(draw(s.deck));
  s.done = true;
  return s;
}

/**
 * Determines outcome from a settled session.
 * @param {object} session
 * @returns {'bj'|'win'|'lose'|'tie'|'bust'}
 */
export function outcome(session) {
  const p = handValue(session.playerHand).points;
  const d = handValue(session.dealerHand).points;
  if (p > 21 && d > 21) return 'bust';
  if (p > 21)           return 'lose';
  if (d > 21)           return 'win';
  if (isNatural(session.playerHand) && !isNatural(session.dealerHand)) return 'bj';
  if (p > d)            return 'win';
  if (p < d)            return 'lose';
  return 'tie';
}

/**
 * Signed balance delta for an outcome.
 * bj → +1.5× bet, win → +bet, tie/bust → 0, lose → -bet
 * @param {'bj'|'win'|'lose'|'tie'|'bust'} result
 * @param {number} bet
 * @returns {number}
 */
export function payout(result, bet) {
  if (result === 'bj')  return Math.floor(bet * 1.5);
  if (result === 'win') return bet;
  if (result === 'tie' || result === 'bust') return 0;
  return -bet;
}

// ─── Embed builder ───────────────────────────────────────────────────────────

const BACK = '🂠';

function renderHand(hand, hideIdx = -1) {
  return hand.map((c, i) => (i === hideIdx ? BACK : emoji(c))).join(' ');
}

function scoreStr(hand, hide = false) {
  if (hide) return `${handValue([hand[0]]).points} + ?`;
  const { points, soft } = handValue(hand);
  return soft ? `${points}*` : String(points);
}

const OUTCOME_LINE = {
  bj:   (d, fmt, cur) => `🎲 ~ You won ${cur} ${fmt(d)}!`,
  win:  (d, fmt, cur) => `🎲 ~ You won ${cur} ${fmt(d)}!`,
  lose: (d, fmt, cur) => `🎲 ~ You lost ${cur} ${fmt(Math.abs(d))}!`,
  // eslint-disable-next-line no-unused-vars
  tie:  (_d, _fmt, _cur) => `🎲 ~ You tied!`,
  // eslint-disable-next-line no-unused-vars
  bust: (_d, _fmt, _cur) => `🎲 ~ You both bust!`,
};

/**
 * Builds the Discord embed for the current game state.
 * @param {object} opts
 * @param {import('discord.js').User} opts.user
 * @param {object}   opts.session
 * @param {boolean}  [opts.gameOver]
 * @param {string}   [opts.result]
 * @param {number}   [opts.newBalance]
 * @param {Function} opts.fmt
 * @param {string}   opts.currency
 * @param {Function} opts.emojiGet   - ctx.emoji()
 * @returns {object} embed
 */
export function buildEmbed({ user, session, gameOver = false, result, newBalance, fmt, currency, emojiGet }) {
  const { playerHand, dealerHand, bet } = session;
  const blank = emojiGet('blank') || '\u200b';

  const dHide  = !gameOver;
  const delta  = gameOver ? payout(result, bet) : 0;

  let footerText = gameOver
    ? `${OUTCOME_LINE[result]?.(delta, fmt, currency) ?? ''}  ·  Balance: ${currency} ${fmt(newBalance)}`
    : `🎲 ~ game in progress  ·  Hit to draw a card, Stand to stop`;

  return {
    color: gameOver ? (RESULT_COLOR[result] ?? COLORS.SLATE) : COLORS.BRAND,
    author: {
      name: `${user.username}, you bet ${currency} ${fmt(bet)} to play blackjack`,
      icon_url: user.displayAvatarURL({ size: 64 }),
    },
    fields: [
      { name: `🏦 Dealer  [${scoreStr(dealerHand, dHide)}]`,  value: renderHand(dealerHand, dHide ? 1 : -1), inline: true },
      { name: blank, value: blank, inline: true },
      { name: `🃏 You  [${scoreStr(playerHand)}]`,            value: renderHand(playerHand),                  inline: true },
    ],
    footer: { text: footerText },
  };
}
