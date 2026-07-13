import { Router } from "express";
import { pool } from "../config/db";

export const healthRouter = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness and DB connectivity check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service and database are healthy
 *       503:
 *         description: Database unreachable
 */
healthRouter.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("Health check failed:", err);
    res.status(503).json({ status: "error", db: "unreachable" });
  }
});
