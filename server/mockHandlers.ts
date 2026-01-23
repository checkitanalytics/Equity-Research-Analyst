export function mockClassifyIntent(query: string) {
  return {
    success: true,
    query,
    intent: "NEWS",
    confidence: 0.92,
    identifier: "TSLA",
    identifier_type: "ticker",
    ticker: "TSLA",
    company_name: "Tesla Inc.",
    industry: "EV",
    rationale: "Mock intent for testing",
  };
}

export function mockCompetitiveAnalysis(
  companyName: string,
  industry: string,
) {
  return {
    success: true,
    company: companyName,
    industry,
    en: {
      forces: {
        competitive_rivalry: { score: 7, analysis: "Mock rivalry details" },
        threat_of_new_entrants: { score: 4, analysis: "Mock entrants" },
        threat_of_substitutes: { score: 5, analysis: "Mock substitutes" },
        supplier_power: { score: 6, analysis: "Mock suppliers" },
        buyer_power: { score: 6, analysis: "Mock buyers" },
      },
      overall_assessment: "Mock overall assessment",
    },
    zh: {
      forces: {
        competitive_rivalry: { score: 7, analysis: "竞争 mock" },
        threat_of_new_entrants: { score: 4, analysis: "新进入者 mock" },
        threat_of_substitutes: { score: 5, analysis: "替代品 mock" },
        supplier_power: { score: 6, analysis: "供应商 mock" },
        buyer_power: { score: 6, analysis: "买方 mock" },
      },
      overall_assessment: "总体评价 mock",
    },
  };
}

export function mockParseEarningsQuery() {
  return {
    ticker: "AAPL",
    topic: "summary",
    quarter: 2,
    year: 2024,
  };
}

export function mockValuationAnalysis(ticker: string) {
  return {
    success: true,
    ticker: ticker.toUpperCase(),
    current_price: 100,
    valuations: {
      dcf: { target_price: 120, upside: 20 },
      relative: { target_price: 110, upside: 10 },
    },
    ai_recommendation: {
      chosen_method: "DCF",
      chosen_price: 120,
      upside_percentage: 20,
      recommendation: "buy",
      confidence: 0.8,
      rationale: "Mock valuation",
    },
    response: "<div>Mock valuation response</div>",
  };
}

export function mockAnalyzeRedflags(ticker: string) {
  return {
    success: true,
    ticker,
    redflag_count: 1,
    severity: "medium",
    summary: "Mock red flag summary",
  };
}

export function mockFdaCompany(ticker: string) {
  return {
    ticker,
    company: "Mock Pharma",
    drugs: [{ drug: "Mockimab", indication: "Mock", event: "PDUFA" }],
  };
}

export function mockFdaCompanies() {
  return { items: ["Mock Pharma"] };
}

export function mockSummarizeEarnings(ticker: string) {
  return {
    success: true,
    ticker,
    summary: "Mock earnings summary",
    issues: ["Mock risk"],
    sentiment: "positive",
  };
}

export function mockRecommendStocks(industry: string) {
  return {
    success: true,
    industry,
    recommendations: [
      { symbol: "AAPL", name: "Apple Inc", rationale: "Mock rationale" },
      { symbol: "MSFT", name: "Microsoft", rationale: "Mock rationale" },
      { symbol: "TSLA", name: "Tesla", rationale: "Mock rationale" },
    ],
    summary: "Mock recommendations",
    timestamp: new Date().toISOString(),
    source: "mock",
  };
}

export function mockGeneralQa(query: string) {
  return {
    success: true,
    query,
    answer: "<strong>💡 Answer</strong><br><br>Mock Q&A answer",
    citations: [],
    timestamp: new Date().toISOString(),
  };
}

export function mockEarningsFallback(query: string) {
  return {
    success: true,
    query,
    response:
      "<strong>📞 Earnings Analysis</strong><br><br>Mock earnings analysis",
    provider: "mock",
    timestamp: new Date().toISOString(),
  };
}

export function mockTranslate(text: string, targetLanguage: string) {
  return {
    success: true,
    translatedText: `[${targetLanguage}] ${text}`,
    originalText: text,
    targetLanguage,
  };
}

export function mockEarningsQuery(
  ticker: string,
  year: number,
  quarter: number,
  topic: string,
) {
  const data =
    topic === "transcript"
      ? { transcript_split: ["Mock transcript line 1"], participants: [] }
      : [{ heading: "Mock Section", content: "Mock content" }];

  return {
    success: true,
    ticker: ticker.toUpperCase(),
    year,
    quarter,
    topic,
    data,
  };
}
