"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

type Result = { ok: boolean; error?: string; tempPassword?: string };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session.user;
}

function tempPassword() {
  // Readable temporary password; the user should change it after first login.
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8)}`;
}

const createSchema = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().email(),
  role: z.enum(["admin", "member"]),
  password: z.string().min(8).max(200).optional(),
});

export async function createUser(input: {
  name?: string;
  email: string;
  role: "admin" | "member";
  password?: string;
}): Promise<Result> {
  await requireAdmin();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email and role." };

  const email = parsed.data.email.toLowerCase();
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return { ok: false, error: "A user with that email already exists." };

  const pw = parsed.data.password?.trim() || tempPassword();
  const passwordHash = await bcrypt.hash(pw, 12);

  await db.insert(users).values({
    email,
    name: parsed.data.name || null,
    role: parsed.data.role,
    active: true,
    passwordHash,
  });

  revalidatePath("/admin/users");
  return { ok: true, tempPassword: parsed.data.password ? undefined : pw };
}

export async function setActive(userId: string, active: boolean): Promise<Result> {
  const me = await requireAdmin();
  if (userId === me.id && !active) {
    return { ok: false, error: "You can't deactivate your own account." };
  }
  await db.update(users).set({ active }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setRole(userId: string, role: "admin" | "member"): Promise<Result> {
  const me = await requireAdmin();
  if (userId === me.id && role !== "admin") {
    return { ok: false, error: "You can't remove your own admin access." };
  }
  await db.update(users).set({ role }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetPassword(userId: string): Promise<Result> {
  await requireAdmin();
  const pw = tempPassword();
  const passwordHash = await bcrypt.hash(pw, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true, tempPassword: pw };
}

export async function deleteUser(userId: string): Promise<Result> {
  const me = await requireAdmin();
  if (userId === me.id) return { ok: false, error: "You can't delete your own account." };
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { ok: true };
}
