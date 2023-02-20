import {commands} from "../index";
import {CommandInteraction, Events} from "discord.js";

export default {
    name: Events.InteractionCreate,
    execute: async (interaction: CommandInteraction) => {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const command = commands.get(interaction.commandName);

        if (!command) return interaction.followUp("Invalid Command!");

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);
        }
    }
}