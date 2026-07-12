import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";

vi.mock("../src/config/db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }) },
}));

const JWT_SECRET = "test-jwt-secret";

function bearerFor(payload: Record<string, unknown>) {
  return `Bearer ${jwt.sign(payload, JWT_SECRET)}`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("POST /api/predict", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.ML_SERVICE_URL = "http://ml-service.test";
  });

  it("rejects requests without a bearer token", async () => {
    const { createApp } = await import("../src/app");
    const res = await request(createApp()).post("/api/predict").send({ text: "great!" });

    expect(res.status).toBe(401);
  });

  it("rejects an empty text body", async () => {
    const { createApp } = await import("../src/app");
    const res = await request(createApp())
      .post("/api/predict")
      .set("Authorization", bearerFor({ sub: "user-1", email: "a@b.com" }))
      .send({ text: "   " });

    expect(res.status).toBe(400);
  });

  it("forwards to ml-service, records history for the caller, and returns the prediction", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        sentiment: "positive",
        confidence: 0.92,
        model_version: "3",
        model_stage: "Production",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createApp } = await import("../src/app");
    const { pool } = await import("../src/config/db");

    const res = await request(createApp())
      .post("/api/predict")
      .set("Authorization", bearerFor({ sub: "user-1", email: "a@b.com" }))
      .send({ text: "great product" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      sentiment: "positive",
      confidence: 0.92,
      model_version: "3",
      model_stage: "Production",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://ml-service.test/predict",
      expect.objectContaining({ method: "POST" })
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO predictions"),
      ["user-1", "a@b.com", "great product", "positive", 0.92, "3", "Production"]
    );
  });

  it("returns 502 without recording history when ml-service is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { createApp } = await import("../src/app");
    const { pool } = await import("../src/config/db");

    const res = await request(createApp())
      .post("/api/predict")
      .set("Authorization", bearerFor({ sub: "user-1", email: "a@b.com" }))
      .send({ text: "great product" });

    expect(res.status).toBe(502);
    expect(pool.query).not.toHaveBeenCalled();
  });
});

describe("GET /api/predict/history", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  it("rejects requests without a bearer token", async () => {
    const { createApp } = await import("../src/app");
    const res = await request(createApp()).get("/api/predict/history");

    expect(res.status).toBe(401);
  });

  it("returns only the caller's own history, most recent first", async () => {
    const { createApp } = await import("../src/app");
    const { pool } = await import("../src/config/db");
    (pool.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      rows: [{ id: 1, input_text: "great", sentiment: "positive", confidence: 0.9 }],
    });

    const res = await request(createApp())
      .get("/api/predict/history")
      .set("Authorization", bearerFor({ sub: "user-1", email: "a@b.com" }));

    expect(res.status).toBe(200);
    expect(res.body.predictions).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_sub = $1"), [
      "user-1",
    ]);
  });

  it("returns 503 instead of crashing when Postgres is unreachable", async () => {
    const { createApp } = await import("../src/app");
    const { pool } = await import("../src/config/db");
    (pool.query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const res = await request(createApp())
      .get("/api/predict/history")
      .set("Authorization", bearerFor({ sub: "user-1", email: "a@b.com" }));

    expect(res.status).toBe(503);
  });
});
