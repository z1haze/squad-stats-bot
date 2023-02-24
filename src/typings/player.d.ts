/**
 * A server which holds a player's stats
 */
export interface PlayerServer {
    kills: number;
    downs: number;
    deaths: number;
    tks: number;
    kdr: number;
    revives: number;
    rating: number;
}

/**
 * A player entity type
 */
export type Player = {
    steamId: string;
    name: string;
    servers: PlayerServer[]
}

export type LeaderboardType = "rating"|"kills"|"revives";