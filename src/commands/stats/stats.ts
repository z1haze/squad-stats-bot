import { ApplicationCommandOptionChoiceData, AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import Fuse from 'fuse.js';

import env from '../../util/env';
import { redis } from '../../index';
import { generateStatsField, getServerLabel, serverOptions } from '../../util/helpers';
import { Player, PlayerServer } from '../../typings/player';
import { getSteamAvatarUrl } from '../../lib/stats';
import { lookupViaDiscord } from '../../db/db';

export const playerCache = new Map<string, string>();

let fusedPlayers: { steamId: string, name: string }[] = [];
const playerSearchCache = new Map<string, ApplicationCommandOptionChoiceData[]>();

async function updatePlayerCache() {
  const fromRedis = await redis.hgetall('players');

  if (Array.isArray(fromRedis)) {
    for (const player of fromRedis) {
      playerCache.set(player.steamId, player.name);
    }
  }

  fusedPlayers = Array.from(playerCache).map(([steamId, name]) => ({steamId, name}));

  console.log(`Updated player search cache. ${playerCache.size} players cached.`);
}

setInterval(updatePlayerCache, 1000 * 60 * 30);

(() => {
  updatePlayerCache();
})();

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
    )
    .addStringOption(option =>
      option.setName('visibility')
        .setDescription('If set to to private, response will be sent only to the command sender')
        .addChoices(
          {name: 'Public', value: 'public'},
          {name: 'Private', value: 'private'}
        )
    )
    .addIntegerOption(option =>
      option.setName('server')
        .setDescription('The server ID')
        .addChoices(...serverOptions)
    ),

  autocomplete: async (interaction: AutocompleteInteraction) => {
    const focusedValue = interaction.options.getFocused();

    if (focusedValue.length < 3) {
      return interaction.respond([]);
    }

    let suggestions: ApplicationCommandOptionChoiceData[] = await new Promise(async resolve => {
      // if the cache already has results for this search string, return them
      if (playerSearchCache.has(focusedValue)) {
        resolve(playerSearchCache.get(focusedValue)!);
      }

      // perform search
      const results = new Fuse(fusedPlayers, {includeScore: true, keys: ['name']})
        .search(focusedValue)
        .slice(0, 25)
        .map(({item}: any) => ({name: item.name, value: item.steamId}));

      if (results.length > 0) {
        playerSearchCache.set(focusedValue, results);
      }

      resolve(results);
    });

    try {
      await interaction.respond(suggestions);
    } catch (error: any) {
      console.error(error.message);
    }
  },

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({
      ephemeral: interaction.options.getString('visibility') === 'private'
    });

    let target = interaction.options.getString('target');

    if (!target) {
      const linkedUser = await lookupViaDiscord(interaction.user.id);

      if (!linkedUser) {
        return interaction.followUp({
          ephemeral: true,
          content: 'You must link your Steam account to use this command. Use `/link` to get started.'
        });
      }

      target = linkedUser.steam_id;
    }

    const serverId = interaction.options.getInteger('server') || env.SERVER_IDS[0];
    const targetResult = await redis.hget(`stats:${serverId}`, target);

    if (!targetResult) {
      return interaction.followUp({
        ephemeral: true,
        content: `No player found matching ${target}.`
      });
    }

    const player: Player = JSON.parse(targetResult);
    const pipeline = redis.pipeline();

    pipeline.zrevrank(`leaderboard:${serverId}:kills`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:incaps`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:falls`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:deaths`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:revives`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:revived`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:tks`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:tkd`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:rating`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:kdr`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:idr`, player.steamId);
    pipeline.zrevrank(`leaderboard:${serverId}:matchCount`, player.steamId);

    let [
      killsRank,
      incapsRank,
      fallsRank,
      deathsRank,
      revivesRank,
      revivedRank,
      tksRank,
      tkdRank,
      overallRank,
      kdRank,
      idRank,
      matchCountRank
    ] = (await pipeline.exec())
      ?.map((result) => result[1] as number)!;

    const playerServer = player.servers.find((server: PlayerServer) => server.id === serverId);

    if (!playerServer) {
      return interaction.followUp({
        ephemeral: true,
        content: `It looks like you have not played on server ${serverId}.`
      });
    }

    const overallFieldValue = generateStatsField(
      env.EMOJI_RATING,
      'Overall Rating',
      playerServer.rating.toFixed(0),
      overallRank
    );

    const matchesFieldValue = generateStatsField(
      env.EMOJI_MATCHES,
      'Games Played',
      playerServer.matchCount.toLocaleString(),
      matchCountRank
    );

    const killsFieldValue = generateStatsField(
      env.EMOJI_KILL,
      'Kills',
      playerServer.kills.toLocaleString(),
      killsRank
    );

    const incapsFieldValue = generateStatsField(
      env.EMOJI_DOWN,
      'Incaps',
      playerServer.incaps.toLocaleString(),
      incapsRank
    );

    const kdFieldValue = generateStatsField(
      env.EMOJI_KD,
      'K/D',
      playerServer.kdr.toFixed(1),
      kdRank
    );

    const idFieldValue = generateStatsField(
      env.EMOJI_ID,
      'I/D',
      playerServer.idr.toFixed(1),
      idRank
    );

    const revivesFieldValue = generateStatsField(
      env.EMOJI_REVIVE,
      'Revives',
      playerServer.revives.toLocaleString(),
      revivesRank
    );

    const revivedFieldValue = generateStatsField(
      env.EMOJI_REVIVE,
      'Revived',
      playerServer.revived.toLocaleString(),
      revivedRank
    );

    const fallsFieldValue = generateStatsField(
      env.EMOJI_FALL,
      'Falls',
      playerServer.falls.toLocaleString(),
      fallsRank
    );

    const deathsFieldValue = generateStatsField(
      env.EMOJI_DEATH,
      'Deaths',
      playerServer.deaths.toLocaleString(),
      deathsRank
    );

    const tksFieldValue = generateStatsField(
      env.EMOJI_TK,
      'Teamkills',
      playerServer.tks.toLocaleString(),
      tksRank
    );

    const tkdFieldValue = generateStatsField(
      env.EMOJI_TK,
      'Teamkilled',
      playerServer.tkd.toLocaleString(),
      tkdRank
    );

    const embed = new EmbedBuilder()
      .setColor('Blurple')
      .setTitle(`${player.name}`)
      .setURL(`https://steamcommunity.com/profiles/${target}`)
      .setDescription(`Showing ${player.name}'s stats on ${getServerLabel(serverId)}.`)
      .addFields(
        {
          name: ' ',
          value: `${overallFieldValue}\n${matchesFieldValue}`
        },
        {
          name: ' ',
          value: `${killsFieldValue}\n${incapsFieldValue}`,
          inline: true
        },
        {
          name: ' ',
          value: `${kdFieldValue}\n${idFieldValue}`,
          inline: true
        },
        {
          name: ' ',
          value: `${revivesFieldValue}\n${revivedFieldValue}`
        },
        {
          name: ' ',
          value: `${fallsFieldValue}\n${deathsFieldValue}`
        },
        {
          name: ' ',
          value: `${tksFieldValue}\n${tkdFieldValue}`
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
