require('dotenv').config();

export default {
    ENVIRONMENT: process.env.ENVIRONMENT || 'development',
    BOT_TOKEN: process.env.BOT_TOKEN || '',
    GUILD_ID: process.env.GUILD_ID || '',
    REDIS_HOST: process.env.REDIS_HOST || 'localhost',
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
}