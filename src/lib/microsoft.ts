// Microsoft Graph: OAuth (authorization-code) + the calls needed to upload a
// file into a Teams channel's Files and post a message. Delegated permissions.
const TENANT = process.env.MS_TENANT_ID || "common";
const AUTH = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/authorize`;
const TOKEN = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`;
const GRAPH = "https://graph.microsoft.com/v1.0";

const SCOPES = [
  "offline_access",
  "User.Read",
  "Team.ReadBasic.All",
  "Channel.ReadBasic.All",
  "ChannelMessage.Send",
  "Files.ReadWrite.All",
].join(" ");

export function microsoftConfigured() {
  return !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
}

function redirectUri() {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/connect/microsoft/callback`;
}

export function microsoftAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(),
    response_mode: "query",
    scope: SCOPES,
    state,
  });
  return `${AUTH}?${p.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

async function tokenRequest(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID!,
      client_secret: process.env.MS_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      ...params,
    }),
  });
  if (!res.ok) throw new Error(`Microsoft token error: ${await res.text()}`);
  return res.json();
}

export function exchangeCode(code: string) {
  return tokenRequest({ grant_type: "authorization_code", code, scope: SCOPES });
}
export function refreshAccessToken(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken, scope: SCOPES });
}

async function graph(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !(init.headers as Record<string, string>)?.["Content-Type"]
        ? { "Content-Type": "application/json" }
        : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Graph ${res.status} on ${path}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

export type MsProfile = { displayName?: string; mail?: string; userPrincipalName?: string };
export async function me(token: string): Promise<MsProfile> {
  return (await graph(token, "/me")).json();
}

export type Team = { id: string; displayName: string };
export async function joinedTeams(token: string): Promise<Team[]> {
  const data = await (await graph(token, "/me/joinedTeams?$select=id,displayName")).json();
  return data.value ?? [];
}

export type Channel = { id: string; displayName: string };
export async function channels(token: string, teamId: string): Promise<Channel[]> {
  const data = await (
    await graph(token, `/teams/${teamId}/channels?$select=id,displayName`)
  ).json();
  return data.value ?? [];
}

// The SharePoint drive folder backing a channel's Files tab.
async function channelFilesFolder(token: string, teamId: string, channelId: string) {
  const data = await (
    await graph(token, `/teams/${teamId}/channels/${channelId}/filesFolder`)
  ).json();
  return { driveId: data.parentReference?.driveId as string, folderId: data.id as string };
}

// Uploads a file into the channel's Files folder; returns its web URL.
export async function uploadTranscript(
  token: string,
  teamId: string,
  channelId: string,
  filename: string,
  content: string
): Promise<{ webUrl: string }> {
  const { driveId, folderId } = await channelFilesFolder(token, teamId, channelId);
  const res = await graph(
    token,
    `/drives/${driveId}/items/${folderId}:/${encodeURIComponent(filename)}:/content`,
    {
      method: "PUT",
      headers: { "Content-Type": "text/markdown" },
      body: content,
    }
  );
  const item = await res.json();
  return { webUrl: item.webUrl };
}

export async function postChannelMessage(
  token: string,
  teamId: string,
  channelId: string,
  html: string
) {
  await graph(token, `/teams/${teamId}/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body: { contentType: "html", content: html } }),
  });
}
