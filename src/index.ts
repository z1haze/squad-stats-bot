import env from "./util/env";
import Redis from "ioredis";
import {
  ApplicationCommandDataResolvable,
  Client,
  Collection,
  Events,
  GatewayIntentBits
} from "discord.js";

import {glob} from "glob";
import {importFile} from "./util/helpers";
import {Command} from "./typings/commands";

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASS
});

export const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]});
export const commands: Collection<string, Command> = new Collection();

(async () => {
  const commandFiles = await glob(`${__dirname}/commands/*/*{.ts,.js}`, {windowsPathsNoEscape: true});
  const eventFiles = await glob(`${__dirname}/events/*{.ts,.js}`, {windowsPathsNoEscape: true});

  const slashCommands: ApplicationCommandDataResolvable[] = await getCommands(commandFiles);

  eventFiles.map(async (filePath) => {
    const event = await importFile(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  });

  client.on(Events.ClientReady, () => {
    if (env.GUILD_ID) {
      // guild commands
      client.guilds.cache.get(env.GUILD_ID)?.commands.set(slashCommands);
    } else {
      // global commands
      client.application?.commands.set(slashCommands);
    }
  });

  await client.login(env.BOT_TOKEN);
})();

async function getCommands(commandFiles: string[]) {
  return Promise.all(
    commandFiles.map(async (filePath) => {
      const command = await importFile(filePath);

      if (!command?.data.name) return;

      commands.set(command.data.name, command);

      return command.data;
    })
  );
}