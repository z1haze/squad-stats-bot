require('dotenv').config();

const SERVER_IDS = process.env.SERVER_IDS ? process.env.SERVER_IDS.split(',').map(x => +x) : [1]

export default {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  GUILD_ID: process.env.GUILD_ID || '',
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
  REDIS_PASS: process.env.REDIS_PASS ?? '',
  LEADERBOARD_PAGE_SIZE: process.env.LEADERBOARD_PAGE_SIZE ? parseInt(process.env.LEADERBOARD_PAGE_SIZE) : 10,
  EMOJI_RATING: process.env.EMOJI_RATING || '',
  EMOJI_KILL: process.env.EMOJI_KILL || '',
  EMOJI_DOWN: process.env.EMOJI_DOWN || '',
  EMOJI_FALL: process.env.EMOJI_FALL || '',
  EMOJI_DEATH: process.env.EMOJI_DEATH || '',
  EMOJI_REVIVE: process.env.EMOJI_REVIVE || '',
  EMOJI_TK: process.env.EMOJI_TK || '',
  EMOJI_KD: process.env.EMOJI_KD || '',
  EMOJI_ID: process.env.EMOJI_ID || '',
  EMOJI_MATCHES: process.env.EMOJI_MATCHES || '',
  SERVER_IDS,
  SERVER_LABELS: process.env.SERVER_LABELS ? process.env.SERVER_LABELS.split(',') : SERVER_IDS.map(x => `Server ${x}`),
  STEAM_API_KEY: process.env.STEAM_API_KEY || 'XXXXXXXXXXXXXXXXXXXXXXX',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
}
