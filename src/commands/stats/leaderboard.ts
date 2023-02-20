import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Show the Squad leaderboard'),
    execute: (interaction: ChatInputCommandInteraction) => interaction.followUp('Ha! You thought this was going to work?'!)
}