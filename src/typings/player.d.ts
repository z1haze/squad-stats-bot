export interface PlayerServer {
    kills: number;
    deaths: number;
    tks: number;
    kd: number;
    revives: number;
}

export type Player = {
    steamID: string;
    playerName: string;
    servers: PlayerServer[]
}