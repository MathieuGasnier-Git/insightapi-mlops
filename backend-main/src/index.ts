import "dotenv/config";
import { createApp } from "./app";
import { ensureSchema } from "./config/db";

const app = createApp();
const port = process.env.PORT || 3000;

// Postgres backs prediction history, not the gateway's core proxying (ml-service
// and service-2 don't depend on it) - so a missing/unreachable DB shouldn't
// stop the whole gateway from booting. Log and carry on; /api/predict already
// tolerates history writes failing, and /api/predict/history reports its own
// errors per-request.
ensureSchema().catch((err) => {
  console.error("Failed to ensure database schema (prediction history may be unavailable):", err);
});

app.listen(port, () => {
  console.log(`backend-main listening on port ${port}`);
});