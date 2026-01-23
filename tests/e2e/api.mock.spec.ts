import { test, expect } from "@playwright/test";

const isMock = process.env.MOCK_API === "1";
const mockDescribe = isMock ? test.describe : test.describe.skip;

mockDescribe("API mock mode", () => {
  test("heartbeat", async ({ request }) => {
    const res = await request.get("/api/test");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.message).toBe("API is working!");
  });

  test("classify-intent", async ({ request }) => {
    const res = await request.post("/api/classify-intent", {
      data: { query: "TSLA news" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.intent).toBe("NEWS");
    expect(json.ticker).toBe("TSLA");
  });

  test("competitive-analysis", async ({ request }) => {
    const res = await request.post("/api/competitive-analysis", {
      data: { companyName: "Tesla", industry: "EV" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.company).toBe("Tesla");
  });

  test("parse-earnings-query", async ({ request }) => {
    const res = await request.post("/api/parse-earnings-query", {
      data: { query: "AAPL Q2 earnings" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.ticker).toBe("AAPL");
  });

  test("valuation-analysis", async ({ request }) => {
    const res = await request.post("/api/valuation-analysis", {
      data: { ticker: "AAPL" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.ticker).toBe("AAPL");
  });

  test("analyze-redflags", async ({ request }) => {
    const res = await request.post("/api/analyze-redflags", {
      data: { ticker: "TSLA", newsContent: "Sample news" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.ticker).toBe("TSLA");
  });

  test("fda companies", async ({ request }) => {
    const res = await request.get("/api/fda/companies");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(Array.isArray(json.items)).toBe(true);
  });

  test("summarize-earnings", async ({ request }) => {
    const res = await request.post("/api/summarize-earnings", {
      data: { ticker: "AAPL", earningsContent: "Earnings content long enough to pass".repeat(5) },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("recommend-stocks", async ({ request }) => {
    const res = await request.post("/api/recommend-stocks", {
      data: { industry: "Tech" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.recommendations.length).toBeGreaterThan(0);
  });

  test("general-qa", async ({ request }) => {
    const res = await request.post("/api/general-qa", {
      data: { query: "What is TSLA?" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("earnings-fallback", async ({ request }) => {
    const res = await request.post("/api/earnings-fallback", {
      data: { query: "TSLA earnings" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  test("translate", async ({ request }) => {
    const res = await request.post("/api/translate", {
      data: { text: "hello", targetLanguage: "zh-CN" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.translatedText).toContain("hello");
  });

  test("earnings/query", async ({ request }) => {
    const res = await request.post("/api/earnings/query", {
      data: { ticker: "TSLA", year: 2024, quarter: 2, topic: "summary" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.ticker).toBe("TSLA");
  });
});
