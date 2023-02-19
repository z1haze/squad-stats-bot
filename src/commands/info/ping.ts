import {Command} from "../../structures/Command";

export default new Command({
    name: 'ping',
    description: 'Responds if the bot is online and listening',
    run: ({interaction}) => interaction.followUp('Pong!')
});