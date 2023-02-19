import {ApplicationCommandDataResolvable, Client, ClientEvents, Collection, GatewayIntentBits } from "discord.js";
import {CommandType} from "../typings/Command";
import glob from "glob";
import {promisify} from "util";
import {RegisterCommandsOptions} from "../typings/Client";
import {Event} from "./Event";

const globPromise = promisify(glob);

export class ExtendedClient extends Client {
    commands: Collection<string, CommandType> = new Collection();

    constructor() {
        super({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]});
    }

    async start() {
        await this.registerModules();
        await this.login(process.env.BOT_TOKEN);
    }

    async importFile(filePath: string) {
        return (await import(filePath))?.default;
    }

    async registerCommands({ commands, guildId }: RegisterCommandsOptions) {
        if (guildId) {
            this.guilds.cache.get(guildId)?.commands.set(commands);
            console.log(`Registered commands for guild ${guildId}`);
        } else {
            this.application?.commands.set(commands);
            console.log('Registering global commands');
        }
    }

    async registerModules() {
        // Commands
        const slashCommands: ApplicationCommandDataResolvable[] = [];
        const commandFiles = await globPromise(`${__dirname}/../commands/*/*{.ts,.js}`, {windowsPathsNoEscape: true});

        commandFiles.map(async filePath => {
            const command: CommandType = await this.importFile(filePath);
            if (!command.name) return;
            this.commands.set(command.name, command);
            slashCommands.push(command);
        });

        this.on('ready', async () => {
            await this.registerCommands({
                commands: slashCommands,
                guildId: process.env.GUILD_ID
            });
        });

        // Events
        const eventFiles = await globPromise(`${__dirname}/../events/*{.ts,.js}`, {windowsPathsNoEscape: true});

        eventFiles.map(async filePath => {
            const event: Event<keyof ClientEvents> = await this.importFile(filePath)
            this.on(event.event, event.run);
        });
    }
}