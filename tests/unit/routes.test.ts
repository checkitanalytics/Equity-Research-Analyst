import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

async function createTestApp() {
  vi.resetModules();
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_KEY;

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const { registerRoutes } = await import("../../server/routes");
  await registerRoutes(app);

  return app;
}

describe("API routes", () => {
  const mockJsonResponse = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  it("returns heartbeat for /api/test", async () => {
    const app = await createTestApp();

    const res = await request(app).get("/api/test");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("API is working!");
    expect(typeof res.body.timestamp).toBe("string");
  });

  it("validates classify-intent payload", async () => {
    const app = await createTestApp();

    const res = await request(app).post("/api/classify-intent").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/query/i);
  });

  it("fails classify-intent when DeepSeek API key is missing", async () => {
    const app = await createTestApp();

    const res = await request(app)
      .post("/api/classify-intent")
      .send({ query: "What's happening with TSLA?" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/DeepSeek API key/i);
  });

  it("/competitive-analysis requires companyName and industry", async () => {
    const app = await createTestApp();
    const res = await request(app).post("/api/competitive-analysis").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/companyName/i);
  });

  it("/parse-earnings-query requires query", async () => {
    const app = await createTestApp();
    const res = await request(app).post("/api/parse-earnings-query").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Query is required/i);
  });

  it("/valuation-analysis requires ticker", async () => {
    const app = await createTestApp();
    const res = await request(app).post("/api/valuation-analysis").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/ticker/i);
  });

  it("/analyze-redflags validates payload and handles missing API key", async () => {
    const app = await createTestApp();
    const bad = await request(app)
      .post("/api/analyze-redflags")
      .send({ ticker: "", newsContent: "" });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post("/api/analyze-redflags")
      .send({ ticker: "TSLA", newsContent: "Elon said something" });
    expect(ok.status).toBe(200);
    expect(ok.body.success).toBe(true);
    expect(ok.body.redflag_count).toBe(0);
  });

  it("FDA proxy routes return mocked data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse({ items: ["foo"] }))
      .mockResolvedValueOnce(mockJsonResponse({ items: ["foo"] }));
    vi.stubGlobal("fetch", fetchMock);
    const app = await createTestApp();

    const byTicker = await request(app).get("/api/fda/companies/TSLA");
    expect(byTicker.status).toBe(200);
    expect(byTicker.body.items).toEqual(["foo"]);

    const search = await request(app).get("/api/fda/companies?company=tesla");
    expect(search.status).toBe(200);
    expect(search.body.items).toEqual(["foo"]);

    vi.unstubAllGlobals();
  });

  it("/summarize-earnings requires ticker and handles short content", async () => {
    const app = await createTestApp();
    const missing = await request(app)
      .post("/api/summarize-earnings")
      .send({});
    expect(missing.status).toBe(400);

    const short = await request(app)
      .post("/api/summarize-earnings")
      .send({ ticker: "AAPL", earningsContent: "too short" });
    expect(short.status).toBe(200);
    expect(short.body.summary).toMatch(/No earnings data/i);
  });

  it("/recommend-stocks validates input and missing API key", async () => {
    const app = await createTestApp();
    const missing = await request(app)
      .post("/api/recommend-stocks")
      .send({});
    expect(missing.status).toBe(400);

    const noKey = await request(app)
      .post("/api/recommend-stocks")
      .send({ industry: "Tech" });
    expect(noKey.status).toBe(503);
    expect(noKey.body.error).toMatch(/Perplexity API not configured/i);
  });

  it("/general-qa validates input and missing API key", async () => {
    const app = await createTestApp();
    const missing = await request(app).post("/api/general-qa").send({});
    expect(missing.status).toBe(400);

    const noKey = await request(app)
      .post("/api/general-qa")
      .send({ query: "Tell me about TSLA" });
    expect(noKey.status).toBe(503);
    expect(noKey.body.error).toMatch(/Perplexity API not configured/i);
  });

  it("/earnings-fallback validates input and missing API key", async () => {
    const app = await createTestApp();
    const missing = await request(app)
      .post("/api/earnings-fallback")
      .send({});
    expect(missing.status).toBe(400);

    const noKey = await request(app)
      .post("/api/earnings-fallback")
      .send({ query: "TSLA earnings" });
    expect(noKey.status).toBe(503);
    expect(noKey.body.error).toMatch(/DeepSeek API not configured/i);
  });

  it("/translate validates input and missing API key", async () => {
    const app = await createTestApp();
    const missing = await request(app).post("/api/translate").send({});
    expect(missing.status).toBe(400);

    const noKey = await request(app)
      .post("/api/translate")
      .send({ text: "hello", targetLanguage: "zh-CN" });
    expect(noKey.status).toBe(503);
    expect(noKey.body.error).toMatch(/DeepSeek API not configured/i);
  });

  it("/earnings/query validates required params", async () => {
    const app = await createTestApp();

    const noTicker = await request(app)
      .post("/api/earnings/query")
      .send({ year: 2024, quarter: 1 });
    expect(noTicker.status).toBe(400);

    const noYear = await request(app)
      .post("/api/earnings/query")
      .send({ ticker: "TSLA", quarter: 1 });
    expect(noYear.status).toBe(400);

    const badQuarter = await request(app)
      .post("/api/earnings/query")
      .send({ ticker: "TSLA", year: 2024, quarter: 5 });
    expect(badQuarter.status).toBe(400);

    const badTopic = await request(app)
      .post("/api/earnings/query")
      .send({ ticker: "TSLA", year: 2024, quarter: 1, topic: "foo" });
    expect(badTopic.status).toBe(400);
  });
});
