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
import {getLeaderboardPlayers} from "../../lib/leaderboard";

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the Squad leaderboard'),

    execute: async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ephemeral: true});

        let page = 1;

        const {embed, row} = await getData(page);

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
                page++
            }

            const {embed, row} = await getData(page);

            await i.update({embeds: [embed], components: [row]});
        });
    }
};

/**
 * Helper function to get embed page data
 *
 * @param page
 */
async function getData(page: number) {
    const playerCount = await redis.hlen('players');
    const pageCount = Math.ceil(playerCount / env.LEADERBOARD_PAGE_SIZE);

    const embed = await getEmbed(page);
    const row = getButtonRow(page, pageCount);

    return {
        embed,
        row
    }
}

/**
 * Create a leaderboard page embed
 *
 * @param page
 */
async function getEmbed(page: number) {
    const embed = new EmbedBuilder()
        .setColor('Blurple')
        .setTitle('Top Shooters');

    const {namesFieldData, killsFieldData, kdFieldData} = await getLeaderboardPlayers(page);

    embed.addFields(
        {name: 'Player:', value: namesFieldData.join('\n'), inline: true},
        {name: 'Kills:', value: killsFieldData.join('\n'), inline: true},
        {name: 'K/D:', value: kdFieldData.join('\n'), inline: true}
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