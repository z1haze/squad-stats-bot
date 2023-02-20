import {ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";

export type Command = {
    data: SlashCommandBuilder;
    execute: (a: ChatInputCommandInteraction) => any
}