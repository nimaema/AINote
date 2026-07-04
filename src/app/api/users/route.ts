import { NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

export const runtime = "nodejs";

// Directory search for assignee / member / mention pickers. Any signed-in user
// may look up teammates by name or email.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const conds = [eq(users.active, true)];
  if (q) conds.push(or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))!);

  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(...conds))
    .limit(10);

  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      name: u.name ?? u.email?.split("@")[0] ?? "Teammate",
      email: u.email,
    })),
  });
}
