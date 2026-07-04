import "dotenv/config";
import express from "express";
import { healthRouter } from "./routes/health";

const app = express();
const port = process.env.PORT || 3000;

app.use(healthRouter);

app.listen(port, () => {
  console.log(`backend-main listening on port ${port}`);
});
