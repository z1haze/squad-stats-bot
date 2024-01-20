import { commands, modalHandlers } from '../index';
import { AutocompleteInteraction, BaseInteraction, ChatInputCommandInteraction, Events } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  execute: async (interaction: BaseInteraction) => {
    if (interaction.isModalSubmit()) {
      await modalHandlers.get(interaction.customId)?.(interaction);

      return;
    } else {
      if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

      const command = commands.get(interaction.commandName);

      if (!command) {
        if (interaction.isChatInputCommand()) {
          await interaction.followUp('Invalid Command!');
        }

        return;
      }

      const call = interaction.isAutocomplete()
        ? command?.autocomplete?.bind(undefined, interaction as AutocompleteInteraction)
        : command.execute.bind(undefined, interaction as ChatInputCommandInteraction);

      try {
        await call?.();
      } catch (error) {
        // console.error(`Error executing ${command.data.name}`);
        // console.error(error);
      }
    }
  }
};
