import type { NextAuthConfig } from "next-auth";

// Edge-safe auth config: NO database or Node-only imports. Used by middleware
// (which runs in the Edge runtime) and spread into the full config in auth.ts.
export const authConfig = {
  session: { strategy: "jwt" },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [], // the Credentials provider (needs the DB) is added in auth.ts
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "member";
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "admin" | "member") ?? "member";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
