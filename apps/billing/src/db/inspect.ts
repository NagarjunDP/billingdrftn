import postgres from "postgres";

async function inspectDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) process.exit(1);
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  const tables = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `;
  console.log("Tables:", tables.map(t => t.table_name));

  for (const t of tables) {
    const cols = await sql`
      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ${t.table_name}
    `;
    console.log(`Table ${t.table_name}:`, cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  }

  await sql.end();
}

inspectDb();
