import NextAuth, { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Test-only identity provider so Playwright can drive the same "Log in"
// button without scripting Google's real consent screen (not automatable
// in CI, and would require storing a real account's credentials). Only
// registered when E2E_TESTING is explicitly set — never in production.
const e2eProvider =
  process.env.E2E_TESTING === "true"
    ? [
        CredentialsProvider({
          id: "e2e",
          name: "E2E Test User",
          credentials: {},
          async authorize() {
            return { id: "e2e-user-1", email: "e2e@insightapi.dev", name: "E2E Test User" };
          },
        }),
      ]
    : [];

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    ...e2eProvider,
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
