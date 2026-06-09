import * as Cloudflare from "alchemy/Cloudflare";

export const MediaDb = Cloudflare.D1Database("MediaDb", {
  migrationsDir: "./migrations"
});
