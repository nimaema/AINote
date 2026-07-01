import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

// Reuse a single instance across HMR reloads / the process lifetime.
const globalForDb = globalThis as unknown as { _db?: DB };

function createDb(): DB {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const client = postgres(connectionString, { max: 10, prepare: false });
  return drizzle(client, { schema });
}

// Lazy: the client is only created on first use, not at import time. This lets
// `next build` import route modules (to collect page data) without a database
// or DATABASE_URL present. The connection still errors clearly at runtime if
// DATABASE_URL is missing.
export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    const real = (globalForDb._db ??= createDb());
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
