import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AutocompleteInteraction,
  ApplicationCommandOptionChoiceData
} from "discord.js";

import env from '../../util/env';
import {redis} from "../../index";
import {getCaseInsensitiveGlobPattern, nth, generateStatsField} from "../../util/helpers";
import {Player, PlayerServer} from "../../typings/player";
import {getSteamAvatarUrl} from "../../lib/stats";

const lookupCache = new Map<string, ApplicationCommandOptionChoiceData[]>();

// clear the cache every hour
setInterval(() => {
  lookupCache.clear();
}, 1000 * 60 * 60);

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
      // if the cache already has results for this search string, return them
      if (lookupCache.has(focusedValue)) {
        resolve(lookupCache.get(focusedValue)!);
        return;
      }

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
          lookupCache.set(focusedValue, suggestions);
          resolve(suggestions);
        }
      });

      stream.on('end', () => {
        if (suggestions.length > 0) {
          lookupCache.set(focusedValue, suggestions);
        }

        resolve(suggestions);
      });
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
    const pipeline = redis.pipeline();

    pipeline.zrevrank('leaderboard:kills', player.steamId);
    pipeline.zrevrank('leaderboard:downs', player.steamId);
    pipeline.zrevrank('leaderboard:falls', player.steamId);
    pipeline.zrevrank('leaderboard:deaths', player.steamId);
    pipeline.zrevrank('leaderboard:revives', player.steamId);
    pipeline.zrevrank('leaderboard:tks', player.steamId);
    pipeline.zrevrank('leaderboard:tkd', player.steamId);
    pipeline.zrevrank('leaderboard:rating', player.steamId);
    pipeline.zrevrank('leaderboard:kdr', player.steamId);
    pipeline.zrevrank('leaderboard:idr', player.steamId);
    pipeline.zrevrank('leaderboard:matchCount', player.steamId);

    let [
      killsRank,
      downsRank,
      fallsRank,
      deathsRank,
      revivesRank,
      tksRank,
      tkdRank,
      overallRank,
      kdRank,
      idRank,
      matchCountRank
    ] = (await pipeline.exec())
      ?.map((result) => result[1] as number)!;

    const overallFieldValue = generateStatsField(
      env.EMOJI_RATING,
      'Overall Rating',
      (player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.rating, 0) / player.servers.length).toFixed(0),
      overallRank
    );

    const matchesFieldValue = generateStatsField(
      env.EMOJI_MATCHES,
      'Games Played',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.matchCount, 0).toLocaleString(),
      matchCountRank
    );

    const killsFieldValue = generateStatsField(
      env.EMOJI_KILL,
      'Kills',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kills, 0).toLocaleString(),
      killsRank
    );

    const downsFieldValue = generateStatsField(
      env.EMOJI_DOWN,
      'Incaps',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.downs, 0).toLocaleString(),
      downsRank
    );

    const kdFieldValue = generateStatsField(
      env.EMOJI_KD,
      'K/D',
      (player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kdr, 0) / player.servers.length).toFixed(1),
      kdRank
    );

    const idFieldValue = generateStatsField(
      env.EMOJI_ID,
      'I/D',
      (player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.idr, 0) / player.servers.length).toFixed(1),
      idRank
    );

    const revivesFieldValue = generateStatsField(
      env.EMOJI_REVIVE,
      'Revives',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.revives, 0).toLocaleString(),
      revivesRank
    );

    const fallsFieldValue = generateStatsField(
      env.EMOJI_FALL,
      'Falls',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.falls, 0).toLocaleString(),
      fallsRank
    );

    const deathsFieldValue = generateStatsField(
      env.EMOJI_DEATH,
      'Deaths',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.deaths, 0).toLocaleString(),
      deathsRank
    );

    const tksFieldValue = generateStatsField(
      env.EMOJI_TK,
      'Teamkills',
      player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.tks, 0).toLocaleString(),
      tksRank
    );

    const tkdFieldValue = generateStatsField(
        env.EMOJI_TK,
        'Teamkilled',
        player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.tkd, 0).toLocaleString(),
        tkdRank
    );

    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle(`${player.name}'s stats`)
      .setURL(`https://steamcommunity.com/profiles/${target}`)
      .setDescription(`Showing stats for ${player.name}.`)
      .addFields(
        {
          name: " ",
          value: `${overallFieldValue}\n${matchesFieldValue}`
        },
        {
          name: " ",
          value: `${killsFieldValue}\n${downsFieldValue}`,
          inline: true
        },
        {
          name: " ",
          value: `${kdFieldValue}\n${idFieldValue}`,
          inline: true
        },
        {
          name: " ",
          value: `${revivesFieldValue}`
        },
        {
          name: " ",
          value: `${fallsFieldValue}\n${deathsFieldValue}\n${tksFieldValue}\n${tkdFieldValue}`
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