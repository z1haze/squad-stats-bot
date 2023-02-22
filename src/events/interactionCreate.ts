import {commands} from "../index";
import {AutocompleteInteraction, ChatInputCommandInteraction, CommandInteraction, Events} from "discord.js";

export default {
    name: Events.InteractionCreate,
    execute: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

        const command = commands.get(interaction.commandName);

        if (!command)
            return interaction.followUp("Invalid Command!");

        const call = interaction.isAutocomplete()
            ? command?.autocomplete?.bind(undefined, interaction as AutocompleteInteraction)
            : command.execute.bind(undefined, interaction as ChatInputCommandInteraction);

        try {
            await call?.();
        } catch (error) {
            console.error(`Error executing ${command.data.name}`);
            console.error(error);
        }
    }
};