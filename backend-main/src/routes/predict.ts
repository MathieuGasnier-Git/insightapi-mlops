import express, { Request } from "express";
import { JwtPayload } from "jsonwebtoken";
import { ML_SERVICE_URL } from "../config/services";
import { pool } from "../config/db";

export const predictRouter = express.Router();

type MlServiceResponse = {
  sentiment: "positive" | "negative";
  confidence: number;
  model_version: string;
  model_stage: string;
};

function currentUser(req: Request): JwtPayload | undefined {
  return typeof req.user === "object" ? req.user : undefined;
}

/**
 * @openapi
 * /api/predict:
 *   post:
 *     summary: Get a sentiment prediction and store it in the user's history
 *     tags: [Predict]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text: { type: string }
 *     responses:
 *       200:
 *         description: Predicted sentiment
 *       400:
 *         description: Missing text
 *       401:
 *         description: Missing bearer token
 *       502:
 *         description: ml-service is unreachable
 */
predictRouter.post("/", express.json(), async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) {
    res.status(400).json({ error: "text is required" });
    return;
  }
  let mlRes: Response;
  try {
    mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    res.status(502).json({ error: "ml-service is unreachable" });
    return;
  }
  const body = await mlRes.json().catch(() => null);
  if (!mlRes.ok || !body) {
    res.status(mlRes.status || 502).json(body ?? { error: "ml-service request failed" });
    return;
  }
  const prediction = body as MlServiceResponse;
  const user = currentUser(req);
  try {
    await pool.query(
      `INSERT INTO predictions
         (user_sub, user_email, input_text, sentiment, confidence, model_version, model_stage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        user?.sub,
        user?.email,
        text,
        prediction.sentiment,
        prediction.confidence,
        prediction.model_version,
        prediction.model_stage,
      ]
    );
  } catch (err) {
    console.error("Failed to record prediction history:", err);
  }
  res.status(200).json(prediction);
});

/**
 * @openapi
 * /api/predict/history:
 *   get:
 *     summary: Get the authenticated user's prediction history
 *     tags: [Predict]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: List of past predictions
 *       401:
 *         description: Missing bearer token
 */
predictRouter.get("/history", async (req, res) => {
  const user = currentUser(req);
  if (!user?.sub) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }
  try {
    const { rows } = await pool.query(
      `SELECT id, input_text, sentiment, confidence, model_version, model_stage, created_at
       FROM predictions
       WHERE user_sub = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [user.sub]
    );
    res.status(200).json({ predictions: rows });
  } catch (err) {
    console.error("Failed to load prediction history:", err);
    res.status(503).json({ error: "Prediction history is temporarily unavailable" });
  }
});