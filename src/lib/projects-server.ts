import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";

export async function getOwnedProject(id: string, userId: string) {
  return db.query.projects.findFirst({
    where: and(eq(projects.id, id), eq(projects.userId, userId)),
  });
}
