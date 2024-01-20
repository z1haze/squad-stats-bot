import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./players.sqlite');

type PlayerLookup = {
  discord_user_id: string,
  steam_id: string
};

export const lookupViaDiscord = (discordUserId: string) => {
  const query = `SELECT * FROM players WHERE discord_user_id = ?`;

  return new Promise<{ discord_user_id: string, steam_id: string }>((resolve, reject) => {
    db.get(query, [discordUserId], (err, row) => {
      if (err) {
        reject(err);
      }

      resolve(row as PlayerLookup);
    });
  });
};

export const upsertPlayer = (discordUserId: string, steamId: string) => {
  const query = `INSERT INTO players(discord_user_id, steam_id) VALUES(?, ?) 
                                              ON CONFLICT(discord_user_id) DO UPDATE SET steam_id = ?`;

  return new Promise<boolean>((resolve, reject) => {
    db.run(query, [discordUserId, steamId, steamId], (err) => {
      if (err) {
        reject(err);
      }

      resolve(true);
    });
  });
};

export default db;
