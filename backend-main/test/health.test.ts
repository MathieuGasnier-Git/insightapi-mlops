import { describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../src/config/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [{ "?column?": 1 }] }) },
}));

import { createApp } from "../src/app";

describe("GET /health", () => {
  it("returns 200 and reports the database as connected", async () => {
    const app = createApp();
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "connected" });
  });
});
