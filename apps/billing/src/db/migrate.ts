import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1, prepare: false });
  
  console.log("🚀 Running DRFTN production schema migration...");
  
  const migrationSQL = readFileSync(
    join(process.cwd(), "src/db/migrations/0002_production_schema.sql"),
    "utf-8"
  );

  try {
    await sql.unsafe(migrationSQL);
    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
