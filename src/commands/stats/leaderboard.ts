import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';

import env from '../../util/env';
import { redis } from '../../index';
import { getLeaderBoardData } from '../../lib/leaderboard';
import { LeaderboardType } from '../../typings/player';

import * as config from '../../config.json';
import { getServerLabel, serverOptions } from '../../util/helpers';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the Squad leaderboard')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('View a different leaderboard')
        .addChoices(
          {name: 'Deaths', value: 'deaths'},
          {name: 'Death Efficiency', value: 'de'},
          {name: 'Incapacitations', value: 'incaps'},
          {name: 'K/D', value: 'kdr'},
          {name: 'Kills', value: 'kills'},
          {name: 'Kill Efficiency', value: 'ke'},
          {name: 'Matches Played', value: 'matchCount'},
          {name: 'Revives', value: 'revives'},
          {name: 'Teamkills', value: 'tks'}
        )
    )
    .addIntegerOption(option =>
      option.setName('server')
        .setDescription('The server ID')
        .addChoices(...serverOptions)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    // immediately defer the reply
    await interaction.deferReply({ephemeral: true});

    const type = (interaction.options.getString('type') || 'rating') as LeaderboardType;
    const serverId = interaction.options.getInteger('server') || env.SERVER_IDS[0];
    const playerCount = await redis.hlen('players');
    const pageCount = Math.ceil(playerCount / env.LEADERBOARD_PAGE_SIZE);

    // page always begins at 1
    let page = 1;

    const embed = await getEmbed(page, type, serverId);
    const row = getButtonRow(page, pageCount);

    const components = [];

    if (!embed.data.description) {
      components.push(row);
    }

    // the initial followup message
    const message = await interaction.followUp({
      ephemeral: true,
      embeds: [embed],
      components,
      fetchReply: true
    });

    // the collector which we will use to update when buttons are clicked
    const collector = message.createMessageComponentCollector();

    collector.on('collect', async (i) => {
      if (!i.isButton()) return;

      if (i.customId === 'prev_page') {
        page--;
      } else {
        page++;
      }

      const playerCount = await redis.hlen('players');
      const pageCount = Math.ceil(playerCount / env.LEADERBOARD_PAGE_SIZE);

      const embed = await getEmbed(page, type, serverId);
      const row = getButtonRow(page, pageCount);

      await i.update({embeds: [embed], components: [row]});
    });
  }
};

/**
 * Get the leaderboard title text depending on the leaderboard type
 *
 * @param type
 */
function getLeaderboardTitle(type: LeaderboardType) {
  if (type in config.leaderboardTitleMap) {
    return config.leaderboardTitleMap[type as keyof typeof config.leaderboardTitleMap];
  }

  return `Top ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}

/**
 * Create a leaderboard page embed
 *
 * @param page
 * @param type
 * @param serverId
 */
async function getEmbed(page: number, type: LeaderboardType, serverId: number) {
  const embed = new EmbedBuilder()
    .setColor('Blurple');

  embed.setTitle(getLeaderboardTitle(type) + ` on (${getServerLabel(serverId)})`);

  const {namesFieldData, scoreFieldData} = await getLeaderBoardData(page, type, serverId);

  if (namesFieldData.length === 0) {
    embed.setDescription('No data to display');
  } else {
    embed.addFields(
      {name: 'Player', value: namesFieldData.join('\n'), inline: true},
      {name: `${type.charAt(0).toUpperCase() + type.slice(1)}`, value: scoreFieldData.join('\n'), inline: true}
    );
  }

  return embed;
}

/**
 * Create a button row for a leaderboard page embed
 *
 * @param page
 * @param pageCount
 */
function getButtonRow(page: number, pageCount: number) {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('prev_page')
        .setLabel('Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId('next_page')
        .setLabel('Next')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === pageCount)
    );
}
