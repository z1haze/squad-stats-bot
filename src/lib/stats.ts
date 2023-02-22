import env from "../util/env";

export async function getSteamAvatarUrl (steamId: string) {
    if (!env.STEAM_API_KEY) return null;

    try {
        const {response} = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${env.STEAM_API_KEY}&steamids=${steamId}`)
            .then((res) => res.json());

        if (response?.players.length) {
            return response.players[0].avatarmedium;
        }

        return null;
    } catch (e) {
        console.error('Failed to add player avatar');
        console.error(e);
    }
}