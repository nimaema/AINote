import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { integrations } from "../db/schema";
import { refreshAccessToken } from "./google";
import { refreshAccessToken as refreshMsToken } from "./microsoft";

type Provider = "google" | "teams";

export async function getIntegration(userId: string, provider: Provider) {
  return db.query.integrations.findFirst({
    where: and(eq(integrations.userId, userId), eq(integrations.provider, provider)),
  });
}

export async function upsertIntegration(
  userId: string,
  provider: Provider,
  fields: {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date | null;
    accountLabel?: string | null;
    config?: Record<string, string> | null;
  }
) {
  const existing = await getIntegration(userId, provider);
  if (existing) {
    await db
      .update(integrations)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(integrations.id, existing.id));
  } else {
    await db.insert(integrations).values({ userId, provider, ...fields });
  }
}

export async function deleteIntegration(userId: string, provider: Provider) {
  await db
    .delete(integrations)
    .where(and(eq(integrations.userId, userId), eq(integrations.provider, provider)));
}

// Returns a valid Google access token, refreshing it if it's about to expire.
export async function getValidGoogleToken(userId: string): Promise<string | null> {
  const it = await getIntegration(userId, "google");
  if (!it?.accessToken) return null;

  const soon = Date.now() + 60_000;
  if (it.expiresAt && it.expiresAt.getTime() > soon) return it.accessToken;

  if (!it.refreshToken) return it.accessToken; // may be stale, but best effort
  const refreshed = await refreshAccessToken(it.refreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  await upsertIntegration(userId, "google", {
    accessToken: refreshed.access_token,
    expiresAt,
  });
  return refreshed.access_token;
}

// Returns a valid Microsoft Graph access token, refreshing if it's near expiry.
export async function getValidMicrosoftToken(userId: string): Promise<string | null> {
  const it = await getIntegration(userId, "teams");
  if (!it?.accessToken) return null;

  const soon = Date.now() + 60_000;
  if (it.expiresAt && it.expiresAt.getTime() > soon) return it.accessToken;
  if (!it.refreshToken) return it.accessToken;

  const refreshed = await refreshMsToken(it.refreshToken);
  await upsertIntegration(userId, "teams", {
    accessToken: refreshed.access_token,
    expiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    ...(refreshed.refresh_token ? { refreshToken: refreshed.refresh_token } : {}),
  });
  return refreshed.access_token;
}
