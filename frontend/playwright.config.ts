import { defineConfig } from "@playwright/test";
import path from "path";

const FRONTEND_PORT = 3100;
const BACKEND_PORT = 4100;
const STUB_ML_PORT = 8110;

const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

const sharedSecrets = {
  JWT_SECRET: "e2e-jwt-secret",
  INTERNAL_EXCHANGE_SECRET: "e2e-internal-secret",
};

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL: FRONTEND_URL,
  },
  webServer: [
    {
      command: `node e2e/stub-ml-service.js`,
      env: { STUB_ML_PORT: String(STUB_ML_PORT) },
      port: STUB_ML_PORT,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev",
      cwd: path.resolve(__dirname, "../backend-main"),
      env: {
        ...sharedSecrets,
        PORT: String(BACKEND_PORT),
        DATABASE_URL: "postgres://user:password@localhost:5432/insightapi",
        ML_SERVICE_URL: `http://localhost:${STUB_ML_PORT}`,
        SERVICE_2_URL: "http://localhost:4002",
        FRONTEND_URL,
      },
      port: BACKEND_PORT,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev -- -p ${FRONTEND_PORT}`,
      env: {
        ...sharedSecrets,
        NEXTAUTH_URL: FRONTEND_URL,
        NEXTAUTH_SECRET: "e2e-nextauth-secret",
        GOOGLE_CLIENT_ID: "unused-in-e2e",
        GOOGLE_CLIENT_SECRET: "unused-in-e2e",
        BACKEND_URL,
        NEXT_PUBLIC_BACKEND_URL: BACKEND_URL,
        E2E_TESTING: "true",
        NEXT_PUBLIC_E2E_TESTING: "true",
      },
      port: FRONTEND_PORT,
      reuseExistingServer: false,
    },
  ],
});
