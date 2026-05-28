import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.SUPABASE_DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing SUPABASE_DATABASE_URL.");
  process.exit(1);
}

const root = process.cwd();
const files = ["schema.sql", "seed.sql"];

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

try {
  for (const file of files) {
    const sqlPath = path.join(root, "supabase", file);
    const sql = await fs.readFile(sqlPath, "utf8");
    console.log(`Applying ${file}...`);
    await client.query(sql);
  }

  console.log("Supabase schema and seed applied.");
} finally {
  await client.end();
}
