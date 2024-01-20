import env from './util/env';
import {initSentry} from './util/sentry';

initSentry();

import Redis from 'ioredis';
import { ApplicationCommandDataResolvable, Client, Collection, Events, GatewayIntentBits, ModalSubmitInteraction } from 'discord.js';
import { glob } from 'glob';
import { importFile } from './util/helpers';
import { Command } from './typings/commands';
import db from './db/db';

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS players (
    discord_user_id TEXT PRIMARY KEY,
    steam_id TEXT NOT NULL
  )`);
});

Redis.Command.setReplyTransformer('hgetall', (result) => {
  if (Array.isArray(result)) {
    const results = [];

    for (let i = 0; i < result.length; i += 2) {
      results.push({name: result[i], steamId: result[i + 1]});
    }

    return results;
  }

  return result;
});

export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASS
});

export const client = new Client({intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]});
export const commands: Collection<string, Command> = new Collection();
export const modalHandlers: Collection<string, (interaction: ModalSubmitInteraction) => Promise<void>> = new Collection();

(async () => {
  const commandFiles = await glob(`${__dirname}/commands/*/*{.ts,.js}`, {windowsPathsNoEscape: true});
  const eventFiles = await glob(`${__dirname}/events/*{.ts,.js}`, {windowsPathsNoEscape: true});
  const modalFiles = await glob(`${__dirname}/modals/*{.ts,.js}`, {windowsPathsNoEscape: true});

  const slashCommands: ApplicationCommandDataResolvable[] = await getCommands(commandFiles);

  eventFiles.map(async (filePath) => {
    const event = await importFile(filePath);

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  });

  modalFiles.map(async (filePath) => {
    const module = await importFile(filePath);

    modalHandlers.set(module.id, module.handler);
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
