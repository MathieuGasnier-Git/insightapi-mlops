import "dotenv/config";
import express from "express";
import { healthRouter } from "./routes/health";
import { predictProxy } from "./routes/predict";
import { graphqlProxy } from "./routes/graphql";
import { requireAuth } from "./middleware/auth";

const app = express();
const port = process.env.PORT || 3000;

app.use(healthRouter);

app.use("/api/predict", requireAuth, predictProxy);
app.use("/api/graphql", requireAuth, graphqlProxy);

app.listen(port, () => {
  console.log(`backend-main listening on port ${port}`);
});
