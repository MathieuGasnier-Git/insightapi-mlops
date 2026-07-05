import express from "express";
import { healthRouter } from "./routes/health";
import { predictProxy } from "./routes/predict";
import { graphqlProxy } from "./routes/graphql";
import { requireAuth } from "./middleware/auth";

export function createApp() {
  const app = express();
  app.use(healthRouter);
  app.use("/api/predict", requireAuth, predictProxy);
  app.use("/api/graphql", requireAuth, graphqlProxy);
  return app;
}
