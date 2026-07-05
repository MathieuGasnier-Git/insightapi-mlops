import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/config/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }) },
}));

describe("POST /api/auth/exchange", () => {
  beforeEach(() => {
    // authExchange.ts reads these at module load time, so the module must
    // be freshly re-imported after the env vars are set for each test.
    vi.resetModules();
    process.env.JWT_SECRET = "test-jwt-secret";
    process.env.INTERNAL_EXCHANGE_SECRET = "test-internal-secret";
  });

  it("rejects requests without the internal secret", async () => {
    const { createApp } = await import("../src/app");
    const res = await request(createApp())
      .post("/api/auth/exchange")
      .send({ sub: "123", email: "a@b.com" });

    expect(res.status).toBe(403);
  });

  it("mints a JWT for a valid internal-secret request", async () => {
    const { createApp } = await import("../src/app");
    const res = await request(createApp())
      .post("/api/auth/exchange")
      .set("x-internal-secret", "test-internal-secret")
      .send({ sub: "123", email: "a@b.com", name: "A" });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });
});
