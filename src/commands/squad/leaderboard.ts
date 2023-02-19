import {Command} from "../../structures/Command";
import {redis} from "../../index";

export default new Command({
    name: 'leaderboard',
    description: 'Shows the stats leaderboard from the Squad server',
    run: async ({interaction}) => {
        console.log(await redis.keys('*'));
        return interaction.followUp({
            ephemeral: true,
            content: 'Ha! You really thought this was gonna work?'
        });
    }
});