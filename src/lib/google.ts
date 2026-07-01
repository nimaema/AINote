// Google OAuth (authorization-code) + Docs creation. Uses drive.file scope so we
// only ever touch documents this app creates.
const AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN = "https://oauth2.googleapis.com/token";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
].join(" ");

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/connect/google/callback`;
}

export function googleAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent",
    state,
  });
  return `${AUTH}?${p.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
};

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json();
}

export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return json.email ?? null;
  } catch {
    return null;
  }
}

// Creates a Google Doc titled `title` and inserts `body` as its contents.
export async function createGoogleDoc(
  accessToken: string,
  title: string,
  body: string
): Promise<{ id: string; url: string }> {
  const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  if (!createRes.ok) throw new Error(`Create doc failed: ${await createRes.text()}`);
  const { documentId } = await createRes.json();

  await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: 1 }, text: body } }],
    }),
  });

  return {
    id: documentId,
    url: `https://docs.google.com/document/d/${documentId}/edit`,
  };
}
