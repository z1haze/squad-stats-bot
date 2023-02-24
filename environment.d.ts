declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string;
            GUILD_ID: string;
            REDIS_HOST: string;
            REDIS_PORT: string;
            REDIS_PASS: string;
            EMOJI_DIVIDER: string;
            EMOJI_KILL: string;
            EMOJI_DOWN: string;
            EMOJI_DEATH: string;
            EMOJI_REVIVE: string;
            EMOJI_TK: string;
            EMOJI_KD: string;
            STEAM_API_KEY: string;
        }
    }
}

export {}