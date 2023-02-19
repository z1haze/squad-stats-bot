import Redis from 'ioredis';
import {RedisClientOptions} from "../typings/RedisClient";

export class RedisClient extends Redis {
    constructor(options: RedisClientOptions) {
        super(options);
    }
}