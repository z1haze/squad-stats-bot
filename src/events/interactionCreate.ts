import {Event} from "../structures/Event";
import {client} from "../index";
import {CommandInteractionOptionResolver} from "discord.js";
import {ExtendedInteraction} from "../typings/Command";

export default new Event('interactionCreate', async (interaction) => {
    // Chat Input Commands
    if (interaction.isCommand()) {
        await interaction.deferReply();

        const command = client.commands.get(interaction.commandName);

        if (!command) return interaction.followUp('Invalid command.');

        command.run({
            args: interaction.options as CommandInteractionOptionResolver,
            client,
            interaction: interaction as ExtendedInteraction
        });
    }
});