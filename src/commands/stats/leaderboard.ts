import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from "discord.js";

import env from "../../util/env";
import {commands, redis} from "../../index";
import {getLeaderboardPlayers} from "../../lib/leaderboard";

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the Squad leaderboard'),
    execute: async (interaction: ChatInputCommandInteraction) => {
        let page = 1;

        const playerCount = await redis.hlen('players');
        const pageCount = Math.ceil(playerCount / env.LEADERBOARD_PAGE_SIZE);

        const embed = await getEmbed(page);
        const row = getButtonRow(page, pageCount);


        // the initial followup message
        const message = await interaction.followUp({
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

            const embed = await getEmbed(page);
            const row = getButtonRow(page, pageCount);

            await i.update({embeds: [embed], components: [row]});
        });
    }
};

async function getEmbed(page: number) {
    return new EmbedBuilder()
        .setColor('#86100b')
        .setTitle('Top Shooters')
        .addFields(...(await getLeaderboardPlayers(page)));
}

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