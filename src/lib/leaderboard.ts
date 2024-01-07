import {redis} from "../index";
import env from "../util/env";
import {LeaderboardType, Player, PlayerServer} from "../typings/player";
import {truncate} from "../util/helpers";

/**
 * get the field data for a leaderboard page
 *
 * @param page
 * @param type
 * @param serverId
 */
export async function getLeaderBoardData(page: number, type: LeaderboardType, serverId: string) {
  /**
   * if page is 1, start/stop should be 0,9
   * if page is 2, start/stop should be 10,19
   * if page is 3, start/stop should be 20,29
   */

  const start = page * env.LEADERBOARD_PAGE_SIZE - env.LEADERBOARD_PAGE_SIZE;
  const stop = start + env.LEADERBOARD_PAGE_SIZE - 1;

  let results;

  // TODO: find a way to not have this conditional
  if (type === 'de') {
    results = await redis.zrange(`leaderboard:${serverId}:${type}`, start, stop);
  } else {
    results = await redis.zrevrange(`leaderboard:${serverId}:${type}`, start, stop);
  }

  const pipeline = redis.pipeline();

  results.forEach((steamId) => pipeline.hget(`stats:${serverId}`, steamId));

  return pipeline.exec()
    .then(results => {
      const namesFieldData: string[] = [];
      const scoreFieldData: string[] = [];

      if (results) {
        results.forEach(([err, result], counter) => {
          if (err) return null;

          const player: Player = JSON.parse(result as string);

          // TODO: don't love this hardcoding
          let fixed;

          switch (type) {
            case 'rating':
            case 'kdr':
              fixed = 1;
              break;
            case 'ke':
            case 'de':
              fixed = 2;
              break;
            default:
              fixed = 0;
          }

          namesFieldData.push(`${start + counter + 1}) ${truncate(player.name, 26)}`);
          scoreFieldData.push((player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr[type], 0) / player.servers.length).toFixed(fixed));
        });
      }

      return {
        namesFieldData,
        scoreFieldData
      }
    });
}
