import {AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";

export type Command = {
    data: SlashCommandBuilder;
    execute: (a: ChatInputCommandInteraction) => any,
    autocomplete?: (a: AutocompleteInteraction) => any
}