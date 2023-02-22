/**
 * A server which holds a player's stats
 */
export interface PlayerServer {
    kills: number;
    deaths: number;
    tks: number;
    kd: number;
    revives: number;
}

/**
 * A player entity type
 */
export type Player = {
    steamID: string;
    playerName: string;
    servers: PlayerServer[]
}