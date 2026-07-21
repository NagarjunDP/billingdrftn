import postgres from "postgres";

async function inspectData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) process.exit(1);
  const sql = postgres(databaseUrl, { max: 1, prepare: false });

  const quick = await sql`SELECT * FROM quick_products LIMIT 5`;
  console.log("quick_products sample:", quick);

  const prod = await sql`SELECT id, name, price FROM products LIMIT 5`;
  console.log("products sample:", prod);

  await sql.end();
}

inspectData();
