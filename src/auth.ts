import NextAuth, { customFetch } from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { roleFromAccessToken, type AppRole } from "./lib/roles";

// Keep the public issuer for browser redirects while routing server fetches through Docker DNS.
const keycloakFetch: typeof fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input.toString());
  const issuerOrigin = process.env.AUTH_KEYCLOAK_ISSUER
    ? new URL(process.env.AUTH_KEYCLOAK_ISSUER).origin
    : undefined;
  const internalOrigin = process.env.AUTH_KEYCLOAK_INTERNAL_ORIGIN;

  if (issuerOrigin && internalOrigin && url.origin === issuerOrigin) {
    const internalUrl = new URL(internalOrigin);
    url.protocol = internalUrl.protocol;
    url.host = internalUrl.host;
  }

  return input instanceof Request
    ? fetch(new Request(url, input), init)
    : fetch(url, init);
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Keycloak({
      clientId: process.env.AUTH_KEYCLOAK_ID,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET,
      issuer: process.env.AUTH_KEYCLOAK_ISSUER,
      [customFetch]: keycloakFetch,
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
