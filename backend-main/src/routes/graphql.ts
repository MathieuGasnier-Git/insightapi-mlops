import { createProxyMiddleware } from "http-proxy-middleware";
import { SERVICE_2_URL } from "../config/services";

// Mounted at /api/graphql, so Express strips that prefix before this
// middleware sees req.url. service-2 (Apollo Server) serves GraphQL at its
// own root path, which is exactly what remains after stripping — no rewrite needed.
export const graphqlProxy = createProxyMiddleware({
  target: SERVICE_2_URL,
  changeOrigin: true,
});
