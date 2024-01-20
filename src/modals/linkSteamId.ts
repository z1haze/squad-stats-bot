import { ModalSubmitInteraction } from 'discord.js';
import db, { upsertPlayer } from '../db/db';

export default {
  id: 'steamIdLinkModal',
  handler: async (interaction: ModalSubmitInteraction) => {
    const steamId = interaction.fields.getTextInputValue('steamId');

    if (isNaN(Number(steamId))) {
      await interaction.reply({
        content: 'That\'s not a Steam64ID! Need help? https://findsteamid.com/',
        ephemeral: true
      });

      return
    }

    await upsertPlayer(interaction.user.id, steamId);

    await interaction.reply({
      content: 'Your Steam ID has been linked. You can now run /stats without searching for your username.',
      ephemeral: true
    });
  }
};
