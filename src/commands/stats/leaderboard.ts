import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from "discord.js";

import env from "../../util/env";
import {redis} from "../../index";
import {getLeaderBoardData} from "../../lib/leaderboard";
import {LeaderboardType} from "../../typings/player";

const config = require('../../config.json');

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the Squad leaderboard')
    .addStringOption(option =>
      option.setName('type')
        .setDescription('View a different leaderboard')
        .addChoices(
          {name: 'Deaths', value: 'deaths'},
          {name: 'Incapacitations', value: 'downs'},
          {name: 'K/D', value: 'kdr'},
          {name: 'Kills', value: 'kills'},
          {name: 'Matches Played', value: 'matchCount'},
          {name: 'Revives', value: 'revives'},
          {name: 'Teamkills', value: 'tks'}
        )),

  execute: async (interaction: ChatInputCommandInteraction) => {
    // immediately defer the reply
    await interaction.deferReply({ephemeral: true});

    const type = (interaction.options.getString('type') || 'rating') as LeaderboardType;
    const playerCount = await redis.hlen('players');
    const pageCount = Math.ceil(playerCount / env.LEADERBOARD_PAGE_SIZE);

    // page always begins at 1
    let page = 1;

    const embed = await getEmbed(page, type);
    const row = await getButtonRow(page, pageCount);

    // the initial followup message
    const message = await interaction.followUp({
      ephemeral: true,
      embeds: [embed],
      components: [row],
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

      const embed = await getEmbed(page, type);
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
    return config.leaderboardTitleMap[type];
  }

  return `Top ${type.charAt(0).toUpperCase() + type.slice(1)}`;
}

/**
 * Create a leaderboard page embed
 *
 * @param page
 * @param type
 */
async function getEmbed(page: number, type: LeaderboardType) {
  const embed = new EmbedBuilder()
    .setColor('Blurple');

  embed.setTitle(getLeaderboardTitle(type));

  const {namesFieldData, scoreFieldData} = await getLeaderBoardData(page, type);

  embed.addFields(
    {name: 'Player', value: namesFieldData.join('\n'), inline: true},
    {name: `${type.charAt(0).toUpperCase() + type.slice(1)}`, value: scoreFieldData.join('\n'), inline: true},
  );

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