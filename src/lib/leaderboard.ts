import {redis} from "../index";
import env from "../util/env";
import {Player, PlayerServer} from "../typings/player";

export async function getLeaderboardPlayers(page: number) {
    /**
     * if page is 1, start/stop should be 0,9
     * if page is 2, start/stop should be 10,19
     * if page is 3, start/stop should be 20,29
     */

    const start = page * env.LEADERBOARD_PAGE_SIZE - env.LEADERBOARD_PAGE_SIZE;
    const stop = start + env.LEADERBOARD_PAGE_SIZE - 1;

    const results = await redis.zrevrange('leaderboard:kills', start, stop);

    const pipeline = redis.pipeline();

    results.forEach((steamId) => pipeline.hget('players', steamId));

    return pipeline.exec()
        .then(results => {
            if (!results) return null;

            const namesFieldData: string[] = [];
            const killsFieldData: number[] = [];
            const kdFieldData: number[] = [];

            results.forEach(([err, result], counter) => {
                if (err) return null;

                const player: Player = JSON.parse(result as string);

                namesFieldData.push(`${start + counter + 1}. ${player.playerName}`);
                killsFieldData.push(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kills, 0));
                kdFieldData.push(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kd, 0) / player.servers.length);
            });

            return [
                {name: 'Player:', value: namesFieldData.join('\n'), inline: true},
                {name: 'Kills:', value: killsFieldData.join('\n'), inline: true},
                {name: 'K/D:', value: kdFieldData.join('\n'), inline: true}
            ];
        });
}