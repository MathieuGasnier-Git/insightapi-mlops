"use client";

import { signIn, signOut, useSession } from "next-auth/react";

// In E2E runs there's no way to script Google's real consent screen, so the
// same button signs in through a test-only credentials provider instead
// (see app/api/auth/[...nextauth]/route.ts). Never enabled outside tests.
const provider = process.env.NEXT_PUBLIC_E2E_TESTING === "true" ? "e2e" : "google";

export default function LoginButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return null;
  }

  if (session) {
    return (
      <button
        type="button"
        onClick={() => signOut()}
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        Log out ({session.user?.email})
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signIn(provider)}
      className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
    >
      Log in with Google
    </button>
  );
}
