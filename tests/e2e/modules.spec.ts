import { test, expect, Page, Request } from "@playwright/test";

const mockJson = async (
  route: any,
  payload: Record<string, unknown>,
  status = 200,
) => {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
};

const routePostJson = async (
  page: Page,
  urlPattern: string | RegExp,
  payload: Record<string, unknown> | ((req: Request, body: any) => any),
) => {
  await page.route(urlPattern, async (route) => {
    const req = route.request();
    const body = req.postData() ? req.postDataJSON() : undefined;
    const responsePayload =
      typeof payload === "function" ? payload(req, body) : payload;
    await mockJson(route, responsePayload);
  });
};

const gotoAndAsk = async (page: Page, message: string) => {
  await page.goto("/");

  let input = page.getByTestId("input-message");
  if ((await input.count()) === 0) {
    input = page.getByTestId("input-message-bottom");
  }

  let button = page.getByTestId("button-send");
  if ((await button.count()) === 0) {
    button = page.getByTestId("button-send-bottom");
  }

  await input.fill(message);
  await button.click();
};

test.describe("Module tests (front-end direct connect and backend /api)", () => {
  test("News module hits search-news-v2 and create-smart-brief", async ({
    page,
  }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "NEWS",
      query: "TSLA news",
      ticker: "TSLA",
    });

    await routePostJson(page, "**/api/search-news-v2", {
      newsContent: "TSLA headline 1\nTSLA headline 2\nSource https://example.com",
    });

    await routePostJson(page, "**/api/create-smart-brief", {
      smartBrief: {
        ticker: "TSLA",
        current_price: 250,
        actionable_insights_section: "Insight A",
        analysis_section: "Analysis B",
        news_section: "News C",
        word_count: 120,
      },
    });

    const searchReq = page.waitForRequest("**/api/search-news-v2");
    await gotoAndAsk(page, "TSLA news");
    await searchReq;

    const briefButton = page.locator("#generate-brief-btn");
    await expect(briefButton).toBeVisible();

    const briefReq = page.waitForRequest("**/api/create-smart-brief");
    await briefButton.click();
    await briefReq;

    await expect(page.getByText(/Smart Brief Generated/i)).toBeVisible();
  });

  test("News brief module hits newsbrief", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "NEWSBRIEF",
      query: "Why did TSLA stock jump?",
      ticker: "TSLA",
      company_name: "Tesla",
    });

    await routePostJson(page, "**/api/newsbrief", {
      current_price: 245,
      news_brief: {
        smartBrief: {
          actionable_insights_section: "Actionable",
          analysis_section: "Analysis",
          news_section: "News section",
          word_count: 50,
        },
      },
    });

    const req = page.waitForRequest("**/api/newsbrief");
    await gotoAndAsk(page, "Why did TSLA stock jump?");
    await req;

    await expect(page.getByText(/Smart News Brief/i)).toBeVisible();
  });

  test("Rumor module hits detect-rumor", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "RUMOR",
      query: "Rumor check: TSLA buys GM",
    });

    await routePostJson(page, "**/api/detect-rumor", {
      _analysis: { fullAnalysis: "Rumor analysis details." },
    });

    const req = page.waitForRequest("**/api/detect-rumor");
    await gotoAndAsk(page, "Rumor check: TSLA buys GM");
    await req;

    await expect(page.getByText(/Rumor Verification Report/i)).toBeVisible();
  });

  test("Earnings summary uses latest-transcript and ai-doc", async ({
    page,
  }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "EARNINGS",
      query: "TSLA earnings summary",
      ticker: "TSLA",
    });

    await routePostJson(page, "**/api/earnings/latest-transcript/TSLA", {
      success: true,
      quarter: "3",
      year: "2024",
    });

    await routePostJson(page, "**/api/earnings/ai-doc**", (req) => {
      const url = req.url();
      if (!url.includes("docType=summary")) return { success: false };
      return {
        success: true,
        data: {
          sections: [
            { heading: "Summary", bullets: ["Revenue up", "Margins stable"] },
          ],
        },
      };
    });

    const latestReq = page.waitForRequest(
      "**/api/earnings/latest-transcript/TSLA",
    );
    const summaryReq = page.waitForRequest((req) =>
      req.url().includes("/api/earnings/ai-doc") &&
      req.url().includes("docType=summary"),
    );

    await gotoAndAsk(page, "TSLA earnings summary");
    await latestReq;
    await summaryReq;

    await expect(
      page
        .locator("div")
        .filter({ hasText: /Earnings Summary/i })
        .filter({ hasText: /TSLA - 2024/i })
        .first(),
    ).toBeVisible();
  });

  test("Earnings Q&A uses ai-doc qa", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "EARNINGS",
      query: "AAPL Q1 2024 qa",
      ticker: "AAPL",
    });

    await routePostJson(page, "**/api/earnings/ai-doc**", (req) => {
      const url = req.url();
      if (!url.includes("docType=qa")) return { success: false };
      return {
        success: true,
        data: {
          conclusion: "Overall strong quarter",
          items: [
            {
              question: "Guidance?",
              response: "Stable",
              sentiment: 7,
            },
          ],
        },
      };
    });

    const qaReq = page.waitForRequest((req) =>
      req.url().includes("/api/earnings/ai-doc") &&
      req.url().includes("docType=qa"),
    );

    await gotoAndAsk(page, "AAPL Q1 2024 qa");
    await qaReq;

    await expect(page.getByText(/Q&A Session/i)).toBeVisible();
  });

  test("Earnings transcript uses latest-transcript and ninjas/transcript", async ({
    page,
  }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "EARNINGS",
      query: "AAPL transcript",
      ticker: "AAPL",
    });

    await routePostJson(page, "**/api/earnings/latest-transcript/AAPL", {
      success: true,
      quarter: "2",
      year: "2024",
    });

    await routePostJson(page, "**/api/ninjas/transcript**", {
      success: true,
      metadata: {
        companyName: "Apple",
        earningsTimingDisplay: "After Market",
        callDate: "2024-05-02",
      },
      participants: [{ name: "Tim Cook", role: "CEO" }],
      transcriptSplit: [
        { role: "CEO", speaker: "Tim Cook", text: "Hello everyone" },
      ],
      transcript: "Full transcript text",
    });

    const latestReq = page.waitForRequest(
      "**/api/earnings/latest-transcript/AAPL",
    );
    const transcriptReq = page.waitForRequest((req) =>
      req.url().includes("/api/ninjas/transcript"),
    );

    await gotoAndAsk(page, "AAPL transcript");
    await latestReq;
    await transcriptReq;

    await expect(page.getByText(/Participants/i)).toBeVisible();
  });

  test("Performance module hits keymetrics endpoints", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "PERFORMANCE",
      query: "How is Apple performance?",
      ticker: null,
      company_name: null,
    });

    await routePostJson(page, "**/api/resolve", {
      ticker: "AAPL",
      name: "Apple Inc.",
    });

    await routePostJson(page, "**/api/find-peers", {
      peers: [{ ticker: "MSFT", name: "Microsoft" }],
    });

    await routePostJson(page, "**/api/get-metrics", {
      AAPL: {
        "Market Cap": { Current: 1000 },
        "Total Revenue": { "2024-Q4": 100, "2024-Q3": 90 },
        "Gross Margin %": { "2024-Q4": 45 },
        "Operating Expense": { "2024-Q4": 20 },
        EBIT: { "2024-Q4": 30 },
        "Net Income": { "2024-Q4": 25 },
        "Free Cash Flow": { "2024-Q4": 22 },
      },
      MSFT: {
        "Market Cap": { Current: 900 },
        "Total Revenue": { "2024-Q4": 95 },
        "Gross Margin %": { "2024-Q4": 42 },
        "Operating Expense": { "2024-Q4": 18 },
        EBIT: { "2024-Q4": 28 },
        "Net Income": { "2024-Q4": 23 },
        "Free Cash Flow": { "2024-Q4": 20 },
      },
    });

    await routePostJson(page, "**/api/peer-key-metrics-conclusion", {
      conclusion_en: "Strong fundamentals",
      period: "2024-Q4",
      llm: "analysis",
    });

    const resolveReq = page.waitForRequest("**/api/resolve");
    const peersReq = page.waitForRequest("**/api/find-peers");
    const metricsReq = page.waitForRequest("**/api/get-metrics");
    const conclusionReq = page.waitForRequest(
      "**/api/peer-key-metrics-conclusion",
    );

    await gotoAndAsk(page, "How is Apple performance?");
    await resolveReq;
    await peersReq;
    await metricsReq;
    await conclusionReq;

    await expect(page.getByText(/Financial Performance/i)).toBeVisible();
  });

  test("Twitter module hits twitter-search and twitter-consolidate", async ({
    page,
  }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "TWITTER",
      query: "TSLA on X",
      ticker: "TSLA",
    });

    await routePostJson(page, "**/api/twitter-search", {
      results: [{ id: "1", text: "$TSLA up" }],
    });

    await routePostJson(page, "**/api/twitter-consolidate", {
      summary: "• $TSLA up 5%\n• Sentiment positive",
      totalTweets: 10,
    });

    const searchReq = page.waitForRequest("**/api/twitter-search");
    const consolidateReq = page.waitForRequest("**/api/twitter-consolidate");

    await gotoAndAsk(page, "TSLA on X");
    await searchReq;
    await consolidateReq;

    await expect(page.getByText(/Twitter\/X Analysis/i)).toBeVisible();
  });

  test("FDA module hits /api/fda/companies/:identifier", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "FDA",
      query: "PFE FDA",
      identifier: "PFE",
      identifier_type: "ticker",
    });

    await routePostJson(page, "**/api/fda/companies/PFE", {
      success: true,
      data: { drugs: [] },
    });

    const req = page.waitForRequest("**/api/fda/companies/PFE");
    await gotoAndAsk(page, "PFE FDA");
    await req;

    await expect(page.getByText(/FDA Drug Pipeline Events/i)).toBeVisible();
  });

  test("Competitive module hits /api/competitive-analysis", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "COMPETITIVE",
      query: "Tesla competitive analysis",
      ticker: "TSLA",
      company_name: "Tesla",
      industry: "EV",
    });

    await routePostJson(page, "**/api/competitive-analysis", {
      success: true,
      company: "Tesla",
      industry: "EV",
      en: {
        overall_assessment: "Strong position",
        forces: {
          competitive_rivalry: { score: 7, analysis: "High" },
          threat_of_new_entrants: { score: 5, analysis: "Medium" },
          threat_of_substitutes: { score: 4, analysis: "Low" },
          supplier_power: { score: 3, analysis: "Low" },
          buyer_power: { score: 6, analysis: "Medium" },
        },
      },
      zh: {
        overall_assessment: "",
        forces: {},
      },
    });

    const req = page.waitForRequest("**/api/competitive-analysis");
    await gotoAndAsk(page, "Tesla competitive analysis");
    await req;

    await expect(
      page.getByRole("heading", { name: /Competitive Analysis/i }),
    ).toBeVisible();
  });

  test("Valuation module hits /api/valuation-analysis", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "VALUATION",
      query: "Is AAPL undervalued?",
      ticker: "AAPL",
      company_name: "Apple",
    });

    await routePostJson(page, "**/api/valuation-analysis", {
      ticker: "AAPL",
      current_price: 100,
      target_price: 120,
      valuations: {
        dcf: { intrinsic_value: 125 },
        relative: { median_estimate: 110 },
      },
      ai_recommendation: {
        confidence: 0.8,
        chosen_method: "DCF",
        rationale: "Solid cash flows",
      },
    });

    const req = page.waitForRequest("**/api/valuation-analysis");
    await gotoAndAsk(page, "Is AAPL undervalued?");
    await req;

    await expect(page.getByText(/Valuation Summary/i)).toBeVisible();
  });

  test("General module hits /api/general-qa", async ({ page }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "GENERAL",
      query: "What is TSLA?",
    });

    await routePostJson(page, "**/api/general-qa", {
      success: true,
      answer: "Tesla is an EV company.",
    });

    const req = page.waitForRequest("**/api/general-qa");
    await gotoAndAsk(page, "What is TSLA?");
    await req;

    await expect(page.getByText(/Tesla is an EV company/i)).toBeVisible();
  });

  test("Screening module hits recommend-stocks and follow-up APIs", async ({
    page,
  }) => {
    await routePostJson(page, "**/api/classify-intent", {
      success: true,
      intent: "SCREENING",
      query: "best stock in Technology",
      industry: "Technology",
    });

    await routePostJson(page, "**/api/recommend-stocks", {
      success: true,
      recommendations: [
        { symbol: "AAPL", name: "Apple", rationale: "Strong fundamentals" },
      ],
    });

    await routePostJson(page, "**/api/valuation-analysis", {
      data: {
        current_price: 100,
        target_price: 120,
        upside_percentage: "20%",
      },
    });

    await routePostJson(page, "**/api/search-news", {
      newsContent: "x".repeat(80),
    });

    await routePostJson(page, "**/api/analyze-redflags", {
      redflag_count: 0,
      summary: "No issues",
    });

    await routePostJson(page, "**/api/rag-search", {
      response: "Earnings content",
      totalSources: 1,
    });

    await routePostJson(page, "**/api/summarize-earnings", {
      summary: "All good",
      sentiment: "positive",
      issues: [],
    });

    const recommendReq = page.waitForRequest("**/api/recommend-stocks");
    const valuationReq = page.waitForRequest("**/api/valuation-analysis");
    const newsReq = page.waitForRequest("**/api/search-news");
    const redFlagsReq = page.waitForRequest("**/api/analyze-redflags");
    const ragReq = page.waitForRequest("**/api/rag-search");
    const summarizeReq = page.waitForRequest("**/api/summarize-earnings");

    await gotoAndAsk(page, "best stock in Technology");
    await recommendReq;
    await valuationReq;
    await newsReq;
    await redFlagsReq;
    await ragReq;
    await summarizeReq;

    await expect(page.getByText(/AI Recommendations/i)).toBeVisible();
  });

  test("Chinese input triggers translate before classify", async ({ page }) => {
    let classifyBody: any = null;

    await routePostJson(page, "**/api/translate", () => ({
      success: true,
      translatedText: "TSLA news",
    }));

    await page.route("**/api/classify-intent", async (route) => {
      const body = route.request().postDataJSON();
      classifyBody = body;
      await mockJson(route, {
        success: true,
        intent: "NEWS",
        query: body?.query,
        ticker: "TSLA",
      });
    });

    await routePostJson(page, "**/api/search-news-v2", {
      newsContent: "TSLA headline",
    });

    const translateReq = page.waitForRequest("**/api/translate");
    const classifyReq = page.waitForRequest("**/api/classify-intent");

    await gotoAndAsk(page, "特斯拉 新闻");
    await translateReq;
    await classifyReq;

    await expect.poll(() => classifyBody?.query).toBe("TSLA news");
  });
});
