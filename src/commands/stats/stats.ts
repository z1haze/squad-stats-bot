import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    AutocompleteInteraction,
    ApplicationCommandOptionChoiceData
} from "discord.js";

import env from '../../util/env';
import {redis} from "../../index";
import {getCaseInsensitivePattern, nth} from "../../util/helpers";
import {Player, PlayerServer} from "../../typings/player";

/**
 * Show an individual player's squad stats
 */
export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show stats for a specific player')
        .addStringOption(option =>
            option.setName('target')
                .setDescription('A player\'s name or their Steam ID')
                .setAutocomplete(true)
                .setRequired(true)),
    autocomplete: async (interaction: AutocompleteInteraction) => {
        const focusedValue = interaction.options.getFocused();

        if (focusedValue.length < 3) {
            return interaction.respond([]);
        }

        const suggestions: ApplicationCommandOptionChoiceData[] = await new Promise(resolve => {
            const suggestions: ApplicationCommandOptionChoiceData[] = [];
            const pattern = getCaseInsensitivePattern(focusedValue);

            const stream = redis.hscanStream("steamusers", {
                match: `*${pattern}*`,
            });

            stream.on('data', (data) => {
                if (data.length) {
                    suggestions.push({name: data[0], value: data[1]});
                }

                if (suggestions.length > 4) {
                    resolve(suggestions);
                }
            });

            stream.on('end', () => resolve(suggestions));
        });

        return interaction.respond(suggestions);
    },
    execute: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply();

        let target = interaction.options.getString('target')!;

        if (
            target.length !== 17
            && isNaN(parseInt(target))
        ) {
            return interaction.followUp({
                ephemeral: true,
                content: 'Invalid target. Player not found.'
            });
        }

        console.log(target);

        const player: Player = JSON.parse((await redis.hget('players', target) as string));

        const embed = new EmbedBuilder()
            .setColor('Blurple')
            .setTitle(`${player.playerName}'s stats`)
            .setURL(`https://steamcommunity.com/profiles/${target}`);

        const playerCount = await redis.hlen('steamusers') as number;
        const killsRank = (await redis.zrevrank('leaderboard:kills', player.steamID) as number) + 1;
        const revivesRank = (await redis.zrevrank('leaderboard:revives', player.steamID) as number) + 1;

        embed.setDescription(`${player.playerName} is ranked **${killsRank.toLocaleString('en-US')}${nth(killsRank)}** in kills and\n**${revivesRank.toLocaleString('en-US')}${nth(revivesRank)}** in revives out of **${playerCount.toLocaleString('en-US')}** players.`);

        embed.addFields(
            {name: 'Stats', value: `${env.EMOJI_KILL} **KILLS:** ${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kills, 0)}\n${env.EMOJI_DEATH} **DEATHS:** ${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.deaths, 0)}\n${env.EMOJI_KD} **K/D:** ${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kd, 0) / player.servers.length}\n${env.EMOJI_REVIVE} **REVIVES:** ${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.revives, 0)}\n${env.EMOJI_TK} **TKS:** ${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.tks, 0)}`}
        )

        try {
            await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${env.STEAM_API_KEY}&steamids=${player.steamID}`)
                .then((res) => res.json())
                .then(({response: {players: [steamUser]}}) => embed.setThumbnail(steamUser.avatarmedium));
        } catch (e) {
            console.error('Failed to add player avatar');
            console.error(e);
        }


        const lastUpdate = await redis.get('lastUpdate')!;

        if (lastUpdate) {
            embed.setFooter({text: 'Last updated'});
            embed.setTimestamp(parseInt(lastUpdate));
        }

        return interaction.followUp({
            embeds: [embed]
        });
    }
};