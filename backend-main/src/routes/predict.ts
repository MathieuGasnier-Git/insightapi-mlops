import { createProxyMiddleware } from "http-proxy-middleware";
import { ML_SERVICE_URL } from "../config/services";

// Mounted at /api/predict, so Express strips that prefix before this
// middleware sees req.url (it arrives as "/" or "/?query"). Rewrite
// whatever remains onto the ml-service's /predict path.
/**
 * @openapi
 * /api/predict:
 *   post:
 *     summary: Proxy to ml-service's sentiment prediction endpoint
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
 *       401:
 *         description: Missing bearer token
 *       403:
 *         description: Invalid or expired token
 */
export const predictProxy = createProxyMiddleware({
  target: ML_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/*/, "/predict"),
});
