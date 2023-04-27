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

    let killsRank = (await redis.zrevrank('leaderboard:kills', player.steamId) as number);
    let downsRank = (await redis.zrevrank('leaderboard:downs', player.steamId) as number);
    let fallsRank = (await redis.zrevrank('leaderboard:falls', player.steamId) as number);
    let deathsRank = (await redis.zrevrank('leaderboard:deaths', player.steamId) as number);
    let revivesRank = (await redis.zrevrank('leaderboard:revives', player.steamId) as number);
    let tksRank = (await redis.zrevrank('leaderboard:tks', player.steamId) as number);
    let overallRank = (await redis.zrevrank('leaderboard:rating', player.steamId) as number);
    let kdRank = (await redis.zrevrank('leaderboard:kdr', player.steamId) as number);
    let idRank = (await redis.zrevrank('leaderboard:idr', player.steamId) as number);
    let matchCountRank = (await redis.zrevrank('leaderboard:matchCount', player.steamId) as number);

    let overallFieldValue = `${env.EMOJI_RATING} **Overall Rating**: `;
    overallFieldValue += `\`${(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.rating, 0) / player.servers.length).toFixed(0)}\``;

    if (overallRank !== null) {
      overallRank++;
      overallFieldValue += ` (${overallRank.toLocaleString()}${nth(overallRank)})`;
    }

    let matchesFieldValue = `${env.EMOJI_MATCHES} **Games Played**: `;
    matchesFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.matchCount, 0).toLocaleString()}\``;

    if (matchCountRank !== null) {
      matchCountRank++;
      matchesFieldValue += ` (${matchCountRank.toLocaleString()}${nth(matchCountRank)})`;
    }

    let killsFieldValue = `${env.EMOJI_KILL} **Kills**: `;
    killsFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kills, 0).toLocaleString()}\``;

    if (killsRank !== null) {
      killsRank++;
      killsFieldValue += ` (${killsRank.toLocaleString()}${nth(killsRank)})`;
    }

    let downsFieldValue = `${env.EMOJI_DOWN} **Downs**: `;
    downsFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.downs, 0).toLocaleString()}\``;

    if (downsRank !== null) {
      downsRank++;
      downsFieldValue += ` (${downsRank.toLocaleString()}${nth(downsRank)})`;
    }

    let kdFieldValue = `${env.EMOJI_KD} **K/D**: `;
    kdFieldValue += `\`${(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.kdr, 0) / player.servers.length).toFixed(1)}\``;

    if (kdRank !== null) {
      kdRank++;
      kdFieldValue += ` (${kdRank.toLocaleString()}${nth(kdRank)})`;
    }

    let idFieldValue = `${env.EMOJI_ID} **I/D**: `;
    idFieldValue += `\`${(player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.idr, 0) / player.servers.length).toFixed(1)}\``;

    if (idRank !== null) {
      idRank++;
      idFieldValue += ` (${idRank.toLocaleString()}${nth(idRank)})`;
    }

    let revivesFieldValue = `${env.EMOJI_REVIVE} **Revives**: `;
    revivesFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.revives, 0).toLocaleString()}\``;

    if (revivesRank !== null) {
      revivesRank++;
      revivesFieldValue += ` (${revivesRank.toLocaleString()}${nth(revivesRank)})`;
    }

    let fallsFieldValue = `${env.EMOJI_FALL} **Falls**: `;
    fallsFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.falls, 0).toLocaleString()}\``;

    if (fallsRank !== null) {
      fallsRank++;
      fallsFieldValue += ` (${fallsRank.toLocaleString()}${nth(fallsRank)})`;
    }

    let deathsFieldValue = `${env.EMOJI_DEATH} **Deaths**: `;
    deathsFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.deaths, 0).toLocaleString()}\``;

    if (deathsRank !== null) {
      deathsRank++;
      deathsFieldValue += ` (${deathsRank.toLocaleString()}${nth(deathsRank)})`;
    }

    let tksFieldValue = `${env.EMOJI_TK} **Teamkills**: `;
    tksFieldValue += `\`${player.servers.reduce((acc: number, curr: PlayerServer) => acc + curr.tks, 0).toLocaleString()}\``;

    if (tksRank !== null) {
      tksRank++;
      tksFieldValue += ` (${tksRank.toLocaleString()}${nth(tksRank)})`;
    }

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
          value: `${fallsFieldValue}\n${deathsFieldValue}\n${tksFieldValue}`
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