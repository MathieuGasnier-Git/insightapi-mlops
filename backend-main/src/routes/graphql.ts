import { createProxyMiddleware } from "http-proxy-middleware";
import { SERVICE_2_URL } from "../config/services";

// Mounted at /api/graphql, so Express strips that prefix before this
// middleware sees req.url. service-2 (Apollo Server) serves GraphQL at its
// own root path, which is exactly what remains after stripping — no rewrite needed.
/**
 * @openapi
 * /api/graphql:
 *   post:
 *     summary: Proxy to service-2's GraphQL API (reviews)
 *     tags: [GraphQL]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               query: { type: string }
 *               variables: { type: object }
 *     responses:
 *       200:
 *         description: GraphQL response
 *       401:
 *         description: Missing bearer token
 *       403:
 *         description: Invalid or expired token
 */
export const graphqlProxy = createProxyMiddleware({
  target: SERVICE_2_URL,
  changeOrigin: true,
});
