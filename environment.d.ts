declare global {
    namespace NodeJS {
        interface ProcessEnv {
            BOT_TOKEN: string;
            GUILD_ID: string;
            ENVIRONMENT: "dev" | "prod" | "debug";
            REDIS_HOST: string;
            REDIS_PORT: string;
            EMOJI_DIVIDER: string;
            STEAM_API_KEY: string;
        }
    }
}

export {}