import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = postgres(url, { max: 1 });
  // pgvector must exist before any migration that creates a vector column.
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrations applied");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
