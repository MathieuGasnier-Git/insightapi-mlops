import { Router } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const INTERNAL_EXCHANGE_SECRET = process.env.INTERNAL_EXCHANGE_SECRET;
const TOKEN_TTL = "15m";

export const authExchangeRouter = Router();

// Called server-side by the frontend's own Next.js route (not directly by
// the browser). The frontend has already validated the user via NextAuth's
// signed session cookie; INTERNAL_EXCHANGE_SECRET proves the caller is that
// trusted frontend server, not an arbitrary client claiming an identity.
authExchangeRouter.post("/", (req, res) => {
  if (!JWT_SECRET || !INTERNAL_EXCHANGE_SECRET) {
    res.status(500).json({ error: "Token exchange is not configured" });
    return;
  }

  if (req.headers["x-internal-secret"] !== INTERNAL_EXCHANGE_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { sub, email, name } = req.body ?? {};
  if (!sub || !email) {
    res.status(400).json({ error: "Missing user identity" });
    return;
  }

  const token = jwt.sign({ sub, email, name }, JWT_SECRET, { expiresIn: TOKEN_TTL });
  res.status(200).json({ token, expiresIn: TOKEN_TTL });
});
