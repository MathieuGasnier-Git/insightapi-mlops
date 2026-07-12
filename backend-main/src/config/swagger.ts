import path from "node:path";
import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: { title: "InsightAPI gateway", version: "0.1.0" },
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  // Matches src/routes/*.ts in dev (tsx) and dist/routes/*.js after `tsc` build.
  // glob requires forward slashes even on Windows, where __dirname uses backslashes.
  apis: [path.join(__dirname, "../routes/*.{ts,js}").split(path.sep).join("/")],
});
