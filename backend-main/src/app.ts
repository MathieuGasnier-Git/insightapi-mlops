import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health";
import { predictRouter } from "./routes/predict";
import { graphqlProxy } from "./routes/graphql";
import { authExchangeRouter } from "./routes/authExchange";
import { requireAuth } from "./middleware/auth";
import { FRONTEND_URL } from "./config/services";

export function createApp() {
  const app = express();
  app.use(cors({ origin: FRONTEND_URL }));
  app.use(healthRouter);
  app.use("/api/auth/exchange", express.json(), authExchangeRouter);
  app.use("/api/predict", requireAuth, predictRouter);
  app.use("/api/graphql", requireAuth, graphqlProxy);
  return app;
}
