import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is not set. DB operations will fail until configured.");
}

const queryClient = postgres(process.env.DATABASE_URL ?? "postgres://invalid", {
  max: 5,
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
export { queryClient as sql };
