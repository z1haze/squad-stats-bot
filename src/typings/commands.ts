import {AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";

/**
 * The type that wraps our command files
 */
export type Command = {
    data: SlashCommandBuilder;
    execute: (a: ChatInputCommandInteraction) => any,
    autocomplete?: (a: AutocompleteInteraction) => any
}