import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";
const INTERNAL_EXCHANGE_SECRET = process.env.INTERNAL_EXCHANGE_SECRET;

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string; name?: string } | undefined;

  if (!user?.id || !user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (!INTERNAL_EXCHANGE_SECRET) {
    return NextResponse.json({ error: "Token exchange is not configured" }, { status: 500 });
  }

  const exchangeRes = await fetch(`${BACKEND_URL}/api/auth/exchange`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": INTERNAL_EXCHANGE_SECRET,
    },
    body: JSON.stringify({ sub: user.id, email: user.email, name: user.name }),
  });

  if (!exchangeRes.ok) {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
  }

  const { token } = await exchangeRes.json();
  return NextResponse.json({ token });
}
