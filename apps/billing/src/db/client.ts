import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. DB operations will fail until configured.");
}

export const sql = postgres(process.env.DATABASE_URL ?? "postgres://invalid", {
  max: 5,
  prepare: false,
});
