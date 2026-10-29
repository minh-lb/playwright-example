import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { roleFromAccessToken, type AppRole } from "./lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
    }),
  ],
  pages: { signIn: "/login" },
  callbacks: {
    async jwt({ token, account }) {
      if (account?.access_token) token.appRole = roleFromAccessToken(account.access_token);
      return token;
    },
    async session({ session, token }) {
      (session.user as typeof session.user & { role?: AppRole | null }).role =
        (token.appRole as AppRole | null) ?? null;
      return session;
    },
  },
});
