/**
 * A server which holds a player's stats
 */
export interface PlayerServer {
  kills: number;
  incaps: number;
  falls: number;
  deaths: number;
  tks: number;
  tkd: number;
  kdr: number;
  idr: number;
  matchCount: number;
  revives: number;
  revived: number;
  rating: number;
  ke: number;
  de: number;
}

/**
 * A player entity type
 */
export type Player = {
  steamId: string;
  name: string;
  servers: PlayerServer[];
}

export type LeaderboardType =
  "rating"
  | "kills"
  | "incaps"
  | "falls"
  | "deaths"
  | "revives"
  | "tks"
  | "tkd"
  | "matchCount"
  | "kdr"
  | "de"
  | "ke";