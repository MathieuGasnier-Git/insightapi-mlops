import { createProxyMiddleware } from "http-proxy-middleware";
import { ML_SERVICE_URL } from "../config/services";

// Mounted at /api/predict, so Express strips that prefix before this
// middleware sees req.url (it arrives as "/" or "/?query"). Rewrite
// whatever remains onto the ml-service's /predict path.
export const predictProxy = createProxyMiddleware({
  target: ML_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => path.replace(/^\/*/, "/predict"),
});
