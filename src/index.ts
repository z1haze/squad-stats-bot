require('dotenv').config();

import {RedisClient} from "./structures/RedisClient";
import {ExtendedClient} from "./structures/Client";

export const redis = new RedisClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : undefined
});

export const client = new ExtendedClient();

client.start();