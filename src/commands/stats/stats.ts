import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AutocompleteInteraction,
  ApplicationCommandOptionChoiceData
} from "discord.js";

import env from '../../util/env';
import {redis} from "../../index";
import {getCaseInsensitiveGlobPattern, nth} from "../../util/helpers";
import {Player, PlayerServer} from "../../typings/player";
import {getSteamAvatarUrl} from "../../lib/stats";

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
        .setRequired(true))
    .addStringOption(option =>
      option.setName('visibility')
        .setDescription('If set to to private, response will be sent only to the command sender')
        .addChoices(
          {name: 'Public', value: 'public'},
          {name: 'Private', value: 'private'}
        )),

  autocomplete: async (interaction: AutocompleteInteraction) => {
    const focusedValue = interaction.options.getFocused();

    if (focusedValue.length < 3) {
      return interaction.respond([]);
    }

    const suggestions: ApplicationCommandOptionChoiceData[] = await new Promise(resolve => {
      const suggestions: ApplicationCommandOptionChoiceData[] = [];
      const pattern = getCaseInsensitiveGlobPattern(focusedValue);

      const stream = redis.hscanStream("players", {
        match: `*${pattern}*`,
      });

      stream.on('data', (data) => {
        if (data.length) {
          suggestions.push({name: data[0], value: data[1]});
        }

        if (suggestions.length > 4) {
          stream.pause();
          resolve(suggestions);
          return;
        }
      });

      stream.on('end', () => resolve(suggestions));
    });

    try {
      await interaction.respond(suggestions);
    } catch (error: any) {
      console.error(error.message);
      console.log(JSON.stringify(suggestions));
    }
  },

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({
      ephemeral: interaction.options.getString('visibility') === 'private'
    });

    let target = interaction.options.getString('target')!;

    const targetResult = await redis.hget('stats', target);

    if (!targetResult) {
      return interaction.followUp({
        ephemeral: true,
        content: `No player found matching ${target}.`
      });
    }

    const player: Player = JSON.parse(targetResult);

    const killsRank = (await redis.zrevrank('leaderboard:kills', player.steamId) as number) + 1;
    const downsRank = (await redis.zrevrank('leaderboard:downs', player.steamId) as number) + 1;
    const fallsRank = (await redis.zrevrank('leaderboard:falls', player.steamId) as number) + 1;
    const deathsRank = (await redis.zrevrank('leaderboard:deaths', player.steamId) as number) + 1;
    const revivesRank = (await redis.zrevrank('leaderboard:revives', player.steamId) as number) + 1;
    const tksRank = (await redis.zrevrank('leaderboard:tks', player.steamId) as number) + 1;
    const overallRank = (await redis.zrevrank('leaderboard:rating', player.steamId) as number) + 1;
    const kdRank = (await redis.zrevrank('leaderboard:kdr', player.steamId) as number) + 1;
    const idRank = (await redis.zrevrank('leaderboard:idr', player.steamId) as number) + 1;
    const matchCountRank = (await redis.zrevrank('leaderboard:matchCount', player.steamId) as number) + 1;

    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle(`${player.name}'s stats`)
      .setURL(`https://steamcommunity.com/profiles/${target}`)
      .setDescription(`Showing stats for ${player.name}.`)
      .addFields(
        {
          name: " ",
          value: `${env.EMOJI_RATING} **Overall Rating**: \`${(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.rating, 0) / player.servers.length).toFixed(0)}\` (${overallRank.toLocaleString()}${nth(overallRank)})\n${env.EMOJI_MATCHES} **Games Played**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.matchCount, 0).toLocaleString()}\` (${matchCountRank.toLocaleString()}${nth(matchCountRank)})`
        },
        {
          name: " ",
          value: `${env.EMOJI_KILL} **Kills**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kills, 0).toLocaleString()}\`  (${killsRank.toLocaleString()}${nth(killsRank)})\n${env.EMOJI_DOWN} **Downs**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.downs, 0).toLocaleString()}\` (${downsRank.toLocaleString()}${nth(downsRank)})`,
          inline: true
        },
        {
          name: " ",
          value: `${env.EMOJI_KD} **K/D**: \`${(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kdr, 0) / player.servers.length).toFixed(1)}\` (${kdRank.toLocaleString()}${nth(kdRank)})\n${env.EMOJI_ID} **I/D**: \`${(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.idr, 0) / player.servers.length).toFixed(1)}\` (${idRank.toLocaleString()}${nth(idRank)})`,
          inline: true
        },
        {
          name: " ",
          value: `${env.EMOJI_REVIVE} **Revives**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.revives, 0).toLocaleString()}\` (${revivesRank.toLocaleString()}${nth(revivesRank)})`
        },
        {
          name: " ",
          value: `${env.EMOJI_FALL} **Downed**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.falls, 0).toLocaleString()}\` (${fallsRank.toLocaleString()}${nth(fallsRank)})\n${env.EMOJI_DEATH} **Deaths**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.deaths, 0).toLocaleString()}\` (${deathsRank.toLocaleString()}${nth(deathsRank)})\n${env.EMOJI_TK} **Teamkills**: \`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.tks, 0).toLocaleString()}\` (${tksRank.toLocaleString()}${nth(tksRank)})`
        }
      );

    const steamAvatarUrl = await getSteamAvatarUrl(player.steamId);

    if (steamAvatarUrl) {
      embed.setThumbnail(steamAvatarUrl);
    }

    const lastUpdate = await redis.get('lastUpdate')!;

    if (lastUpdate) {
      embed.setFooter({text: 'Valid until'});
      embed.setTimestamp(parseInt(lastUpdate));
    }

    return interaction.followUp({
      embeds: [embed]
    });
  }
};