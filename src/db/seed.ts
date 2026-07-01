import { db } from "./index";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Seeds the first admin from env. No public signup exists — admins add the rest
// from /admin/users. Safe to run repeatedly; it upserts by email.
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existing) {
    await db
      .update(users)
      .set({ role: "admin", active: true, passwordHash })
      .where(eq(users.email, email));
    console.log(`✓ admin updated: ${email}`);
  } else {
    await db.insert(users).values({
      email,
      name: "Admin",
      role: "admin",
      active: true,
      passwordHash,
    });
    console.log(`✓ admin created: ${email}`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
