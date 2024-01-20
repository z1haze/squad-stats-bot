import { ActionRowBuilder, ChatInputCommandInteraction, ModalActionRowComponentBuilder, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('link')
    .setDescription('Link your Discord account with your Steam account'),

  execute: async (interaction: ChatInputCommandInteraction) => {
    const modal = new ModalBuilder()
      .setCustomId('steamIdLinkModal')
      .setTitle('Link your Steam ID');

    const steamId = new TextInputBuilder()
      .setCustomId('steamId')
      .setLabel('Enter your Steam 64 ID')
      .setMinLength(17)
      .setMaxLength(17)
      .setStyle(TextInputStyle.Short);

    const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(steamId);

    modal.addComponents(row);

    await interaction.showModal(modal);
  }
};
