import "dotenv/config";
import { createApp } from "./app";

const app = createApp();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`backend-main listening on port ${port}`);
});