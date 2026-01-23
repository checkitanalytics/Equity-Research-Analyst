import { test, expect } from "@playwright/test";
import fs from "fs/promises";
import path from "path";

const hasDeepSeek = !!(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY);
const hasPerplexity = !!process.env.PERPLEXITY_API_KEY;
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const valuationUrl = process.env.VALUATION_API_URL;
const fdaUrl = "https://fdacalendar.checkitanalytics.com/api/companies";
const realOutputDir = "test-results/api-real";

test.describe("API real mode (requires external network and API keys)", () => {
  const attachJson = async (name: string, payload: any) => {
    await test.info().attach(name, {
      body: JSON.stringify(payload, null, 2),
      contentType: "application/json",
    });
  };

  test.beforeEach(async () => {
    if (process.env.MOCK_API === "1") {
      test.skip(true, "Skip real suite when MOCK_API=1");
    }
  });

  const realTestDeepSeek = hasDeepSeek ? test : test.skip;
  let valuationReachable = !!valuationUrl;
  let valuationSkipReason = "";
  let fdaReachable = true;
  let fdaSkipReason = "";

  test.beforeAll(async () => {
    await fs.mkdir(realOutputDir, { recursive: true }).catch(() => {});

    // Valuation service probe
    if (!valuationUrl) {
      valuationReachable = false;
      valuationSkipReason = "VALUATION_API_URL missing";
    } else {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(valuationUrl, { method: "GET", signal: controller.signal }).catch(() => undefined);
        clearTimeout(timeout);
        if (!res || !res.ok) {
          valuationReachable = false;
          valuationSkipReason = "Valuation service unreachable";
        }
      } catch {
        valuationReachable = false;
        valuationSkipReason = "Valuation service unreachable";
      }
    }

    // FDA probe
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(fdaUrl, { method: "GET", signal: controller.signal }).catch(() => undefined);
      clearTimeout(timeout);
      if (!res || !res.ok) {
        fdaReachable = false;
        fdaSkipReason = "FDA endpoint unreachable";
      }
    } catch {
      fdaReachable = false;
      fdaSkipReason = "FDA endpoint unreachable";
    }
  });

  const realTestValuation = valuationReachable ? test : test.skip;
  const realTestFDA = fdaReachable ? test : test.skip;
  const realTestPerplexity = hasPerplexity ? test : test.skip;
  const realTestOpenAIPerplexity = hasPerplexity && hasOpenAI ? test : test.skip;

  const saveResult = async (name: string, payload: any) => {
    const file = path.join(realOutputDir, `${name}.json`);
    await fs.writeFile(file, JSON.stringify(payload, null, 2), "utf-8");
  };

  realTestDeepSeek("classify-intent real call", async ({ request }) => {
    test.skip(!hasDeepSeek, "DeepSeek API key missing");
    const res = await request.post("/api/classify-intent", {
      data: { query: "TSLA news" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.intent).toBeDefined();
    await attachJson("classify-intent.json", json);
    await saveResult("classify-intent", json);
  });

  realTestValuation("valuation-analysis real call", async ({ request }) => {
    test.skip(!valuationReachable, valuationSkipReason);
    const res = await request.post("/api/valuation-analysis", {
      data: { ticker: "AAPL" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("valuation-analysis.json", json);
    await saveResult("valuation-analysis", json);
  });

  realTestPerplexity("recommend-stocks real call", async ({ request }) => {
    test.skip(!hasPerplexity, "PERPLEXITY_API_KEY missing");
    const res = await request.post("/api/recommend-stocks", {
      data: { industry: "Tech" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("recommend-stocks.json", json);
    await saveResult("recommend-stocks", json);
  });

  realTestPerplexity("general-qa real call", async ({ request }) => {
    test.skip(!hasPerplexity, "PERPLEXITY_API_KEY missing");
    const res = await request.post("/api/general-qa", {
      data: { query: "What is Tesla?" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("general-qa.json", json);
    await saveResult("general-qa", json);
  });

  realTestOpenAIPerplexity("competitive-analysis real call", async ({ request }) => {
    test.skip(!hasOpenAI, "OPENAI_API_KEY missing");
    test.skip(!hasPerplexity, "PERPLEXITY_API_KEY missing");
    const res = await request.post("/api/competitive-analysis", {
      data: { companyName: "Tesla", industry: "EV" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("competitive-analysis.json", json);
    await saveResult("competitive-analysis", json);
  });

  realTestDeepSeek("analyze-redflags real call", async ({ request }) => {
    test.skip(!hasDeepSeek, "DeepSeek API key missing");
    const res = await request.post("/api/analyze-redflags", {
      data: { ticker: "TSLA", newsContent: "News content" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("analyze-redflags.json", json);
    await saveResult("analyze-redflags", json);
  });

  realTestFDA("fda companies real call", async ({ request }) => {
    test.skip(!fdaReachable, fdaSkipReason);
    const res = await request.get("/api/fda/companies");
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    await attachJson("fda-companies.json", json);
    await saveResult("fda-companies", json);
  });

  realTestDeepSeek("summarize-earnings real call", async ({ request }) => {
    test.skip(!hasDeepSeek, "DeepSeek API key missing");
    const res = await request.post("/api/summarize-earnings", {
      data: { ticker: "AAPL", earningsContent: "Earnings content long enough to pass".repeat(5) },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("summarize-earnings.json", json);
    await saveResult("summarize-earnings", json);
  });

  realTestDeepSeek("earnings-fallback real call", async ({ request }) => {
    test.skip(!hasDeepSeek, "DeepSeek API key missing");
    const res = await request.post("/api/earnings-fallback", {
      data: { query: "AAPL earnings" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("earnings-fallback.json", json);
    await saveResult("earnings-fallback", json);
  });

  realTestDeepSeek("translate real call", async ({ request }) => {
    test.skip(!hasDeepSeek, "DeepSeek API key missing");
    const res = await request.post("/api/translate", {
      data: { text: "hello", targetLanguage: "zh-CN" },
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.success).toBe(true);
    await attachJson("translate.json", json);
    await saveResult("translate", json);
  });

  test("earnings/query real call", async ({ request }) => {
    const res = await request.post("/api/earnings/query", {
      data: { ticker: "TSLA", year: 2024, quarter: 2, topic: "summary" },
    });
    expect(res.status() === 200 || res.status() === 404).toBeTruthy();
    const json = await res.json().catch(() => ({}));
    await attachJson("earnings-query.json", json);
    await saveResult("earnings-query", json);
  });
});
