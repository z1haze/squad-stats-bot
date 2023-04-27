import {Client, Events} from "discord.js";

export default {
  name: Events.ClientReady,
  once: true,
  execute: (c: Client) => console.log(`Ready! Logged in as ${c?.user?.tag}`)
}