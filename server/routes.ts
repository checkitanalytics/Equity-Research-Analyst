// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Router } from "express";
import * as mockHandlers from "./mockHandlers";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_KEY;

// ✅ 新增: Python 估值服务 URL
const VALUATION_API_URL =
  process.env.VALUATION_API_URL || "http://localhost:8501";

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MOCK_MODE = process.env.MOCK_API === "1";

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = Router();

  console.log("📝 Registering API routes...");
  if (MOCK_MODE) {
    console.log("🧪 MOCK_API=1 enabled: returning stubbed data for external APIs");
  }

  // ========== 测试路由 ==========
  apiRouter.get("/test", (req, res) => {
    console.log("✅ /api/test endpoint called");
    res.json({
      message: "API is working!",
      timestamp: new Date().toISOString(),
      openai_configured: !!process.env.OPENAI_API_KEY,
      valuation_api_configured: !!process.env.VALUATION_API_URL,
    });
  });

  apiRouter.post("/classify-intent", async (req, res) => {
    console.log("🎯 /api/classify-intent called");

    try {
      const { query } = req.body;

      if (!query || typeof query !== "string" || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Valid query string is required",
        });
      }

      console.log("🤖 Processing query:", query);

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockClassifyIntent(query));
      }

      if (!DEEPSEEK_API_KEY) {
        return res.status(500).json({
          success: false,
          error: "DeepSeek API key not configured",
        });
      }

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            temperature: 0.1,
            max_tokens: 250,
            messages: [
              {
                role: "system",
                content: `You are an intent classifier for stock research queries.

  Classify the user query into ONE of these categories:

  **FDA - Drug regulatory/approval queries ONLY**

Your FDA API searches by: company name, ticker, or drug name.
ONLY classify as FDA when user asks about DRUG-SPECIFIC regulatory information.

✅ FDA Trigger Keywords (query MUST contain at least one):
- Approval related: "FDA approval", "approved", "approval status", "PDUFA", "NDA", "BLA", "FDA calendar"
- Clinical trials: "clinical trial", "phase 1", "phase 2", "phase 3", "trial results"
- Drug portfolio: "drug pipeline", "what drugs", "drug portfolio"
- Safety/Recall: "recall", "warning letter", "drug safety", "adverse event"
- Specific drug queries: asking about a specific drug by name

✅ FDA Examples (your API CAN answer):
- "When will Pfizer's new cancer drug be approved?" → FDA, identifier: "Pfizer", identifier_type: "company_name"
- "JNJ drug recall history" → FDA, identifier: "JNJ", identifier_type: "ticker"
- "What's the FDA approval status for Keytruda?" → FDA, identifier: "Keytruda", identifier_type: "drug_name"
- "Moderna clinical trial phase 3 results" → FDA, identifier: "Moderna", identifier_type: "company_name"
- "ABBV drug pipeline" → FDA, identifier: "ABBV", identifier_type: "ticker"
- "FDA calendar for next week" → FDA, identifier: null, identifier_type: null
- "What drugs does Merck make?" → FDA, identifier: "Merck", identifier_type: "company_name"
- "Has Ozempic been FDA approved?" → FDA, identifier: "Ozempic", identifier_type: "drug_name"

❌ NOT FDA (even for pharma companies - use other intents):
- "Pfizer stock news today" → NEWS, ticker: "PFE"
- "Why did Moderna drop 10%?" → NEWSBRIEF, ticker: "MRNA"
- "Should I buy JNJ?" → NEWSBRIEF, ticker: "JNJ"
- "Eli Lilly earnings report" → EARNINGS, ticker: "LLY"
- "How is AbbVie stock performing?" → PERFORMANCE, ticker: "ABBV"
- "What's happening with biotech stocks?" → NEWS, ticker: null
- "Pfizer latest headlines" → NEWS, ticker: "PFE"

⚠️ CRITICAL RULE: 
Company being a pharma/biotech company is NOT enough to trigger FDA!
The query must specifically ask about DRUGS, APPROVALS, TRIALS, or REGULATORY matters.

Rules:
- Query must ask about drug/regulatory information, not general company news
- AI should extract: company name, ticker, OR drug name as identifier
- identifier_type can be: "ticker", "company_name", or "drug_name"
- If no specific entity mentioned: identifier: null, identifier_type: null

  **TWITTER - Twitter/X related questions**
  Keywords: "twitter", "x", "tweet", "x.com", "on twitter", "on x", "tweeted", "posted on x", "x post"
  Examples:
  ✅ "What did Elon Musk say on Twitter?" → TWITTER
  ✅ "Check Tesla's latest tweet" → TWITTER, ticker: "TSLA"
  ✅ "What's trending on X about Apple?" → TWITTER, ticker: "AAPL"
  ✅ "Elon posted on X about..." → TWITTER
  ✅ "Microsoft's Twitter announcement" → TWITTER, ticker: "MSFT"
  Rules:
  - Must mention Twitter, X, tweet, or related terms
  - Extract ticker if specific company mentioned
  - Set ticker: null if no specific company
  
  **VALUATION - Stock valuation analysis ONLY**
Keywords: "fair value", "intrinsic value", "undervalued", "overvalued", "DCF", "valuation model", "price target"
Examples:
✅ "What's Apple's fair value?" → VALUATION, ticker: "AAPL"
✅ "Is Tesla undervalued based on DCF?" → VALUATION, ticker: "TSLA"
✅ "NVDA intrinsic value calculation" → VALUATION, ticker: "NVDA"
✅ "Is Microsoft overvalued right now?" → VALUATION, ticker: "MSFT"
❌ "Should I buy Tesla?" → NEWSBRIEF (investment decision, not valuation)
❌ "Can I buy Apple now?" → NEWSBRIEF (investment decision, not valuation)
❌ "现在可以买吗?" → NEWSBRIEF (investment decision, not valuation)
Rules:
- ONLY for explicit valuation/fair value questions
- "Should I buy" / "Can I buy" / "Worth buying" → NEWSBRIEF, NOT VALUATION

  **SCREENING - Multiple stock recommendations**
  Keywords: "what stock should I invest", "which stocks", "best stocks", "top stocks", "recommend stocks"
  Examples:
  ✅ "What stock should I invest in?" → SCREENING, industry: null
  ✅ "Which stocks are undervalued?" → SCREENING, industry: null  
  ✅ "Best stocks in Technology?" → SCREENING, industry: "Technology"
  Rules:
  - Asking for MULTIPLE stocks or general recommendations
  - Set ticker: null
  - Extract industry if mentioned

  **NEWS - General news search (headlines/latest updates) OR non-company specific questions**
  Keywords: "news", "latest news", "headlines", "what's happening", "updates", "news today", "recent news"
  Examples:
  ✅ "Apple news for today" → NEWS, ticker: "AAPL"
  ✅ "Latest Tesla headlines" → NEWS, ticker: "TSLA"
  ✅ "What's the latest news on Microsoft?" → NEWS, ticker: "MSFT"
  ✅ "Why did the stock market drop today?" → NEWS, ticker: null
  ✅ "What happened to tech stocks?" → NEWS, ticker: null
  Rules:
  - General request for NEWS without specific company event
  - Can have ticker (company-specific news) OR no ticker (market news)

  **NEWSBRIEF - Company-specific questions (news events, investment decisions, stock movements)**
Keywords: "why did [COMPANY]", "what happened to [COMPANY]", "should I buy [COMPANY]", 
       "can I buy [COMPANY]", "worth buying [COMPANY]", "现在可以买", "能买吗",
       "[COMPANY] sales data", "[COMPANY] revenue", "[COMPANY] deliveries"
Examples:
✅ "Why did Intel stock jump today?" → NEWSBRIEF, ticker: "INTC"
✅ "What happened to Tesla stock?" → NEWSBRIEF, ticker: "TSLA"
✅ "Should I buy NVDA?" → NEWSBRIEF, ticker: "NVDA"
✅ "Can I still buy Tesla now?" → NEWSBRIEF, ticker: "TSLA"
✅ "现在可以买 Workhorse 吗?" → NEWSBRIEF, ticker: "WKHS"
✅ "Worth buying Microsoft?" → NEWSBRIEF, ticker: "MSFT"
Rules:
- Query MUST mention a SPECIFIC company or ticker
- Investment decision questions (buy/sell) go here, NOT VALUATION
- If no company/ticker found → classify as NEWS, never NEWSBRIEF

  **RUMOR - Rumor verification/fact-checking**
  Keywords: "rumor", "rumor check", "is it true", "fake news", "verify", "fact check", 
         "merger", "acquisition", "acquiring", "being acquired"
  Examples:
  ✅ "Rumor check: Is Qualcomm going to acquire Intel?" → RUMOR
  ✅ "Is it true that Apple is buying Disney?" → RUMOR
  ✅ "Is Microsoft really acquiring Activision?" → RUMOR
  Rules:
  - Explicitly asks for rumor verification
  - Extract ticker if specific company mentioned

  **EARNINGS - Earnings CONTENT analysis only**
Keywords: "earnings summary", "earnings results", "how was earnings", "earnings call analysis", "beat/miss earnings"
Examples:
✅ "Tesla earnings summary" → EARNINGS, ticker: "TSLA"
✅ "How was Apple Q3 earnings?" → EARNINGS, ticker: "AAPL"
✅ "Did NVDA beat earnings?" → EARNINGS, ticker: "NVDA"

❌ NOT EARNINGS:
- "When is Tesla earnings?" → GENERAL (date question)
- "Tesla earnings date" → GENERAL (date question)

⚠️ RULE: "when/date/time/schedule" + earnings → GENERAL, not EARNINGS

  **PERFORMANCE - Financial metrics/data**
  Keywords: "performance", "how is [COMPANY] doing", "metrics", "financial data", "fundamentals"
  Examples:
  ✅ "How is Microsoft doing?" → PERFORMANCE, ticker: "MSFT"
  ✅ "Tesla performance metrics" → PERFORMANCE, ticker: "TSLA"
  Rules:
  - Questions about company performance or financial metrics
  - Extract ticker if specific company mentioned

  **COMPETITIVE - Company industry competitive analysis (Porter's Five Forces)**
  Keywords: "competitors", "competition", "competitive landscape", "market position",
           "market share", "industry analysis", "vs competitors", "compare with peers", 
           "industry position", "competitive advantage", "moat", "five forces",
           "threat", "rivalry", "supplier power", "buyer power", "new entrants"
  Examples:
  ✅ "Tesla's market position in EV" → COMPETITIVE, ticker: "TSLA", industry: "Electric Vehicles"
  ✅ "What's Apple's competitive advantage?" → COMPETITIVE, ticker: "AAPL", industry: "Consumer Electronics"
  ✅ "NVDA's moat in GPU market" → COMPETITIVE, ticker: "NVDA", industry: "Semiconductors"
  ✅ "Who are Microsoft's main competitors in cloud?" → COMPETITIVE, ticker: "MSFT", industry: "Cloud Computing"
  ✅ "Amazon's market position" → COMPETITIVE, ticker: "AMZN", industry: "E-commerce"
  ✅ "How strong is Tesla's competitive moat?" → COMPETITIVE, ticker: "TSLA", industry: "Electric Vehicles"
  ✅ "Netflix竞争分析" → COMPETITIVE, ticker: "NFLX", industry: "Streaming"
  ✅ "苹果的市场地位怎么样" → COMPETITIVE, ticker: "AAPL", industry: "Consumer Electronics"
  Rules:
  - MUST have a specific company/ticker
  - AI MUST infer industry from company context (e.g., Tesla → EV, Apple → Consumer Electronics)
  - Both ticker AND industry are REQUIRED for this intent
  - If no company mentioned → classify as GENERAL, not COMPETITIVE

  **GENERAL - General questions AND date/schedule queries**
Examples:
✅ "How does the stock market work?" → GENERAL
✅ "What is P/E ratio?" → GENERAL
✅ "When is Tesla earnings?" → GENERAL (asking for date)
✅ "What date is Apple earnings report?" → GENERAL (asking for date)
✅ "When is the Fed meeting?" → GENERAL (asking for date)
✅ "NVDA earnings date?" → GENERAL (asking for date)
Rules:
- Educational or general market questions
- ANY question asking for dates, times, or schedules
- Keywords: "when is", "what date", "what time", "schedule" → GENERAL

  **🚨 CRITICAL DECISION RULES (Priority Order):**

1. If query contains "rumor", "is it true", "fact check", "verify" → RUMOR
2. If query asks about "earnings", "quarterly results", "earnings call" → EARNINGS
3. If query asks about "fair value", "intrinsic value", "undervalued", "overvalued", "DCF" → VALUATION
4. If query asks "should I buy", "can I buy", "worth buying", "现在可以买" with ticker → NEWSBRIEF
5. If query asks "why did [SPECIFIC COMPANY]", "what happened to [SPECIFIC COMPANY]" with ticker → NEWSBRIEF
6. If query asks for "news", "headlines", "latest updates" → NEWS
7. If query asks about drug approval/trials/recalls/pipeline/FDA status → FDA
8. If query asks about "performance", "how is [COMPANY] doing" → PERFORMANCE
9. If query asks for stock recommendations without specific company → SCREENING
10. If NO specific company mentioned in "why/what" question → NEWS (not NEWSBRIEF)
11. Otherwise → GENERAL

💡 FDA Litmus Test: "Is the user asking about DRUGS or REGULATORY info?"
   - Yes → FDA
   - No (even if pharma company) → Use appropriate other intent

  **🎯 NEWSBRIEF vs NEWS Decision Tree:**
  Question: "Why did [X] happen?"
  → Is X a specific company/ticker? 
   → YES: NEWSBRIEF with ticker
   → NO: NEWS with ticker: null

  **You MUST return ONLY valid JSON in this exact format:**
{
  "intent": "FDA|TWITTER|VALUATION|SCREENING|NEWS|NEWSBRIEF|RUMOR|EARNINGS|PERFORMANCE|GENERAL",
  "confidence": 0.95,
  "identifier": "TSLA" or null,
  "identifier_type": "ticker" or "company_name" or null,
  "ticker": "TSLA" or null,
  "company_name": "Tesla Inc." or null,
  "industry": "Technology" or null,
  "rationale": "Keep it short, 5-10 words max. Do NOT mention rules or classification logic."
}

  **Identifier Type Rules:**
  - AI should recognize pharmaceutical companies even if not explicitly listed
  - If identifier looks like a stock ticker (2-5 uppercase letters) → identifier_type: "ticker"
  - If identifier contains words/spaces or is a company name → identifier_type: "company_name"
  - Common pharma ticker mappings AI should know:
    * JNJ = Johnson & Johnson
    * PFE = Pfizer
    * MRK = Merck
    * ABBV = AbbVie
    * LLY = Eli Lilly
    * BMY = Bristol Myers Squibb
    * AMGN = Amgen
    * GILD = Gilead
    * MRNA = Moderna
  - If no company mentioned → identifier: null, identifier_type: null
  - Always include ticker and company_name fields for backward compatibility

  **VALIDATION RULE:**
  If intent is NEWSBRIEF but ticker is null → change intent to NEWS`,
              },
              {
                role: "user",
                content: `Classify: "${query}"`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `DeepSeek API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("Empty response from DeepSeek");
      }

      console.log("🤖 Raw response:", content);

      let result;
      try {
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent
            .replace(/```json\s*/g, "")
            .replace(/```\s*$/g, "");
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.replace(/```\s*/g, "");
        }

        result = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("❌ JSON parse error:", parseError);
        return res.json({
          success: true,
          query,
          intent: "GENERAL",
          confidence: 0.5,
          identifier: null,
          identifier_type: null,
          ticker: null,
          company_name: null,
          industry: null,
          rationale: "Failed to parse, defaulting to GENERAL",
        });
      }

      const validIntents = [
        "FDA",
        "TWITTER",
        "VALUATION",
        "SCREENING",
        "NEWS",
        "NEWSBRIEF",
        "RUMOR",
        "EARNINGS",
        "PERFORMANCE",
        "COMPETITIVE",
        "GENERAL",
      ];

      let intent = validIntents.includes(result.intent)
        ? result.intent
        : "GENERAL";

      // 🚨 CRITICAL FIX: NEWSBRIEF must have a ticker
      if (intent === "NEWSBRIEF" && !result.ticker) {
        console.warn(
          `⚠️ NEWSBRIEF without ticker detected, changing to NEWS. Query: "${query}"`,
        );
        intent = "NEWS";
        result.rationale = `Changed from NEWSBRIEF to NEWS because no specific company/ticker was found. ${result.rationale || ""}`;
      }
      if (intent === "COMPETITIVE" && !result.ticker) {
        console.warn(
          `⚠️ COMPETITIVE without ticker detected, changing to GENERAL`,
        );
        intent = "GENERAL";
      }

      const confidence =
        typeof result.confidence === "number"
          ? Math.max(0, Math.min(1, result.confidence))
          : 0.7;

      console.log("✅ Classification result:", {
        intent,
        identifier: result.identifier,
        identifier_type: result.identifier_type,
        ticker: result.ticker,
        company_name: result.company_name,
        industry: result.industry,
        rationale: result.rationale,
      });

      res.json({
        success: true,
        query,
        intent,
        confidence,
        identifier: result.identifier || null,
        identifier_type: result.identifier_type || null,
        ticker: result.ticker || null,
        company_name: result.company_name || null,
        industry: result.industry || null,
        rationale: result.rationale || "",
      });
    } catch (error) {
      console.error("❌ Classification error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const statusCode = errorMessage.includes("API key") ? 503 : 500;

      res.status(statusCode).json({
        success: false,
        error: "Failed to classify intent",
        details: errorMessage,
        intent: "GENERAL",
        confidence: 0.5,
        identifier: null,
        identifier_type: null,
        ticker: null,
        company_name: null,
        industry: null,
      });
    }
  });

  apiRouter.post("/competitive-analysis", async (req, res) => {
    try {
      const { companyName, industry, additionalContext = "" } = req.body;

      if (!companyName || !industry) {
        return res.status(400).json({
          success: false,
          error: "companyName and industry are required",
        });
      }

      if (MOCK_MODE) {
        return res.json(
          mockHandlers.mockCompetitiveAnalysis(companyName, industry),
        );
      }

      // 1. Perplexity搜集情报
      let researchContext = "";
      try {
        const perplexityRes = await fetch(
          "https://api.perplexity.ai/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            },
            body: JSON.stringify({
              model: "sonar-reasoning-pro",
              messages: [
                {
                  role: "system",
                  content:
                    "You are a business research assistant. Provide concise, factual competitive intelligence.",
                },
                {
                  role: "user",
                  content: `Research ${companyName} in the ${industry} industry. Identify key competitors, market position, and recent strategic moves. ${additionalContext ? `Context: ${additionalContext}` : ""}`,
                },
              ],
              temperature: 0.2,
            }),
          },
        );

        if (perplexityRes.ok) {
          const data = await perplexityRes.json();
          researchContext = data.choices[0]?.message?.content || "";
        }
      } catch (e) {
        console.warn("Perplexity request failed:", e);
      }

      // 2. OpenAI做Five Forces分析
      const prompt = `Analyze ${companyName} in the ${industry} industry using Porter's Five Forces.

  Research Context:
  ${researchContext || "No real-time research available."}

  ${additionalContext ? `Additional context: ${additionalContext}` : ""}

  Return ONLY valid JSON. List competitor names. Format:
  {
    "company": "${companyName}",
    "industry": "${industry}",
    "en": {
      "forces": {
        "competitive_rivalry": { "score": 8, "analysis": "..." },
        "threat_of_new_entrants": { "score": 6, "analysis": "..." },
        "threat_of_substitutes": { "score": 7, "analysis": "..." },
        "supplier_power": { "score": 5, "analysis": "..." },
        "buyer_power": { "score": 6, "analysis": "..." }
      },
      "overall_assessment": "..."
    },
    "zh": {
      "forces": {
        "competitive_rivalry": { "score": 8, "analysis": "..." },
        "threat_of_new_entrants": { "score": 6, "analysis": "..." },
        "threat_of_substitutes": { "score": 7, "analysis": "..." },
        "supplier_power": { "score": 5, "analysis": "..." },
        "buyer_power": { "score": 6, "analysis": "..." }
      },
      "overall_assessment": "..."
    }
  }`;

      const openaiRes = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert business analyst. Respond ONLY with valid JSON.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 2000,
          }),
        },
      );

      if (!openaiRes.ok) {
        throw new Error(`OpenAI error: ${await openaiRes.text()}`);
      }

      const openaiData = await openaiRes.json();
      const analysis = JSON.parse(openaiData.choices[0].message.content);

      res.json({ success: true, ...analysis });
    } catch (error) {
      console.error("Competitive analysis error:", error);
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: errMsg });
    }
  });

  // 解析用户的 earnings 查询
  apiRouter.post("/parse-earnings-query", async (req: any, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockParseEarningsQuery());
      }

      // 使用 DeepSeek 解析
      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: `Extract earnings query parameters from user input. Return JSON only, no markdown, no code blocks:
  {
    "ticker": "AAPL",
    "topic": "summary|transcript|qa",
    "quarter": 1-4,
    "year": 2024
  }
  Rules:
  - ticker: Stock symbol (2-5 letters), default "AAPL"
  - topic: "transcript" for full call, "summary" for overview, "qa" for Q&A session. Default "summary"
  - quarter: 1-4, default to latest available (current quarter - 1)
  - year: 4-digit year, default current year
  Return ONLY the JSON object, nothing else.`,
              },
              { role: "user", content: query },
            ],
            max_tokens: 100,
            temperature: 0.1,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content?.trim() || "";

      // 清理 markdown 代码块
      content = content
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/gi, "")
        .trim();

      console.log("Cleaned content:", content); // 调试日志

      // 解析 JSON
      const parsed = JSON.parse(content);

      res.json({
        ticker: parsed.ticker?.toUpperCase() || "AAPL",
        topic: parsed.topic || "summary",
        quarter:
          parsed.quarter ||
          Math.max(1, Math.ceil((new Date().getMonth() + 1) / 3) - 1),
        year: parsed.year || new Date().getFullYear(),
      });
    } catch (error: any) {
      console.error("Parse earnings query error:", error);

      // 返回默认值而不是错误，让流程继续
      res.json({
        ticker: "AAPL",
        topic: "summary",
        quarter: Math.max(1, Math.ceil((new Date().getMonth() + 1) / 3) - 1),
        year: new Date().getFullYear(),
        parseError: error.message,
      });
    }
  });

  // /api/valuation-analysis 端点
  apiRouter.post("/valuation-analysis", async (req, res) => {
    console.log("💰 /api/valuation-analysis called");

    try {
      const { ticker, query } = req.body;

      if (!ticker || typeof ticker !== "string") {
        return res.status(400).json({
          success: false,
          error: "Valid ticker symbol is required",
        });
      }

      console.log(`🔍 Valuation request for: ${ticker}`);

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockValuationAnalysis(ticker));
      }

      // ========================================
      // 只使用 Python DCF 服务
      // ========================================

      console.log("📊 Calling Python DCF service...");

      const pythonResponse = await fetch(
        `${VALUATION_API_URL}/api/full-valuation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ticker }),
          signal: AbortSignal.timeout(40000), // 15秒超时
        },
      );

      if (!pythonResponse.ok) {
        const errorData = await pythonResponse
          .json()
          .catch(() => ({ error: "Unknown error" }));

        console.warn(`⚠️ Python DCF failed: ${errorData.error}`);

        // 直接返回错误
        return res.json({
          success: false,
          ticker: ticker.toUpperCase(),
          error: "Valuation service unavailable",
          details:
            errorData.error || `Python DCF returned ${pythonResponse.status}`,
          data: null,
          response: `<div style="padding: 16px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px;">
            <strong>💰 Valuation Analysis - ${ticker.toUpperCase()}</strong><br><br>
            <div style="color: #856404; font-weight: 600;">⚠️ Service Temporarily Unavailable</div>
            <div style="font-size: 0.9em; margin-top: 8px; color: #666;">
              Our DCF valuation service is currently unavailable. Please try:<br>
              • News Analysis for latest updates<br>
              • Performance Analysis for financial metrics<br>
              • Try again in a few minutes
            </div>
          </div>`,
        });
      }

      // Python DCF 成功
      const valuationData = await pythonResponse.json();
      console.log("✅ Python DCF successful");

      const upside = parseFloat(valuationData.upside_percentage);

      // 判断估值状态
      const valuationStatus =
        upside < -5
          ? "Overvalued"
          : upside > 5
            ? "Undervalued"
            : "Fairly Valued";
      const statusColor =
        upside < -5 ? "#ef4444" : upside > 5 ? "#10b981" : "#f59e0b";

      // 修改后的简洁格式
      // 修改后的版本 - 箭头居中，百分比完全居中
      const userResponse = `<strong>💰 Valuation Analysis for ${valuationData.ticker}</strong><br><br>
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px; color: white; position: relative;">

        <!-- 主容器使用 flex 布局 -->
        <div style="display: flex; align-items: center; justify-content: space-between;">

          <!-- 左侧：价格信息 -->
          <div style="display: flex; align-items: center; gap: 16px;">
            <div>
              <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">Current Price</div>
              <div style="font-size: 26px; font-weight: bold;">$${valuationData.current_price.toFixed(2)}</div>
            </div>

            <!-- 箭头 - 垂直居中 -->
            <div style="font-size: 20px; opacity: 0.6; display: flex; align-items: center; height: 100%;">→</div>

            <div>
              <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px;">Target Price</div>
              <div style="font-size: 26px; font-weight: bold;">$${valuationData.target_price.toFixed(2)}</div>
            </div>
          </div>

          <!-- 右侧：涨跌幅信息 - 使用绝对定位居中 -->
          <div style="position: absolute; left: 50%; transform: translateX(-50%); 
                      background: ${statusColor}; padding: 10px 20px; border-radius: 10px; text-align: center;">
            <div style="font-size: 22px; font-weight: bold; line-height: 1;">
              ${upside > 0 ? "+" : ""}${upside.toFixed(1)}%
            </div>
            <div style="font-size: 11px; margin-top: 3px; font-weight: 500; text-transform: uppercase;">
              ${valuationStatus}
            </div>
          </div>

          <!-- 占位元素，保持布局平衡 -->
          <div style="width: 140px;"></div>
        </div>

        <!-- 底部信息栏 -->
        <div style="display: flex; gap: 20px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 12px; opacity: 0.9;">
          <span><strong>Confidence:</strong> ${(valuationData.confidence * 100).toFixed(0)}%</span>
          <span><strong>Method:</strong> ${valuationData.method}</span>
        </div>

        ${
          valuationData.rationale
            ? `
        <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; font-size: 12px; line-height: 1.5; margin-top: 10px;">
          ${valuationData.rationale}
        </div>`
            : ""
        }
      </div>`;

      // 修改这部分返回
      res.json({
        success: true,
        ticker: valuationData.ticker,
        current_price: valuationData.current_price,

        // ✅ 新增：返回完整的估值数据
        valuations: valuationData.details
          ? {
              dcf: valuationData.details.dcf_valuation,
              relative: valuationData.details.relative_valuation,
            }
          : null,

        // ✅ 新增：AI 推荐
        ai_recommendation: {
          chosen_method: valuationData.method,
          chosen_price: valuationData.target_price,
          upside_percentage: valuationData.upside_percentage,
          recommendation: valuationData.recommendation,
          confidence: valuationData.confidence,
          rationale: valuationData.rationale,
        },

        // 保留原始的 response 用于向后兼容
        response: userResponse,

        // 保留原有字段
        data: {
          current_price: valuationData.current_price,
          target_price: valuationData.target_price,
          upside_percentage: valuationData.upside_percentage,
          recommendation: valuationData.recommendation,
          confidence: valuationData.confidence,
          method: valuationData.method,
        },
        details: valuationData.details || null,
        ai_fallback_used: false,
      });
    } catch (error) {
      console.error("❌ Valuation error:", error);

      res.json({
        success: false,
        ticker: req.body.ticker || "Unknown",
        error: "Analysis failed",
        details: error instanceof Error ? error.message : "Unknown error",
        data: null,
        response: `<div style="padding: 16px; background: #ffebee; border-left: 4px solid #ef5350; border-radius: 8px;">
          <strong>💰 Valuation Analysis</strong><br><br>
          <div style="color: #c62828; font-weight: 600;">❌ Analysis Unavailable</div>
          <div style="font-size: 0.9em; margin-top: 8px; color: #666;">
            Unable to complete valuation. Try News Analysis or Performance Analysis.
          </div>
        </div>`,
      });
    }
  });

  // ========== Red Flag Analysis API ==========
  apiRouter.post("/analyze-redflags", async (req, res) => {
    console.log("🚩 /api/analyze-redflags called");

    try {
      const { ticker, newsContent } = req.body;

      if (!ticker || !newsContent) {
        return res.status(400).json({
          success: false,
          error: "Ticker and newsContent are required",
        });
      }

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockAnalyzeRedflags(ticker));
      }

      // ✅ 改用DeepSeek
      if (!DEEPSEEK_API_KEY) {
        return res.json({
          success: true,
          redflag_count: 0,
          severity: "unknown",
          summary: "DeepSeek API not configured",
        });
      }

      console.log(`🔍 Analyzing red flags for ${ticker} using DeepSeek`);

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            temperature: 0.1,
            max_tokens: 250,
            messages: [
              {
                role: "system",
                content: `Analyze news for red flags (risks, issues, problems). 
  Return ONLY valid JSON with: redflag_count (0-5), severity (low/medium/high), summary.
  No markdown, no code blocks, just pure JSON.`,
              },
              {
                role: "user",
                content: `Analyze news for ${ticker}:\n\n${newsContent.substring(0, 1500)}\n\nReturn JSON: {"redflag_count": number, "severity": "low|medium|high", "summary": "text"}`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";

      console.log("🤖 DeepSeek response:", content);

      // 清理可能的markdown包裹
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent
          .replace(/```json\s*/g, "")
          .replace(/```\s*$/g, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```\s*/g, "");
      }

      const result = JSON.parse(cleanContent);

      console.log(
        `✅ Found ${result.redflag_count || 0} red flags for ${ticker}`,
      );

      res.json({
        success: true,
        ticker,
        redflag_count: result.redflag_count || 0,
        severity: result.severity || "low",
        summary: result.summary || "No red flags",
      });
    } catch (error) {
      console.error("❌ Red flag error:", error);
      res.json({
        success: true,
        redflag_count: 0,
        severity: "unknown",
        summary: "Analysis failed",
      });
    }
  });

  // api/fda-proxy endpoint
  apiRouter.get("/fda/companies/:ticker", async (req, res) => {
    try {
      const { ticker } = req.params;
      if (MOCK_MODE) {
        return res.json(mockHandlers.mockFdaCompany(ticker));
      }
      const response = await fetch(
        `https://fdacalendar.checkitanalytics.com/api/companies/${ticker}`,
      );
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FDA proxy error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get("/fda/companies", async (req, res) => {
    try {
      const { company } = req.query;
      if (MOCK_MODE) {
        return res.json(mockHandlers.mockFdaCompanies());
      }
      let url = `https://fdacalendar.checkitanalytics.com/api/companies`;
      if (company) {
        url = `https://fdacalendar.checkitanalytics.com/api/companies/search?company=${encodeURIComponent(company)}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("FDA proxy error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========== Earnings Summary API ==========
  apiRouter.post("/summarize-earnings", async (req, res) => {
    console.log("📞 /api/summarize-earnings called");

    try {
      const { ticker, earningsContent } = req.body;

      if (!ticker) {
        return res.status(400).json({
          success: false,
          error: "Ticker is required",
        });
      }

      if (!earningsContent || earningsContent.length < 50) {
        return res.json({
          success: true,
          summary: "No earnings data",
          issues: [],
          sentiment: "neutral",
        });
      }

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockSummarizeEarnings(ticker));
      }

      // ✅ 改用DeepSeek
      if (!DEEPSEEK_API_KEY) {
        return res.json({
          success: true,
          summary: "DeepSeek API not configured",
          issues: [],
          sentiment: "neutral",
        });
      }

      console.log(`🔍 Summarizing earnings for ${ticker} using DeepSeek`);

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            temperature: 0.1,
            max_tokens: 300,
            messages: [
              {
                role: "system",
                content: `Summarize earnings and identify issues. 
  Return ONLY valid JSON with: summary (brief text), issues (array), sentiment (positive/neutral/negative).
  No markdown, no code blocks, just pure JSON.`,
              },
              {
                role: "user",
                content: `Summarize earnings for ${ticker}:\n\n${earningsContent.substring(0, 1500)}\n\nReturn JSON: {"summary": "text", "issues": [], "sentiment": "positive|neutral|negative"}`,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";

      console.log("🤖 DeepSeek response:", content);

      // 清理可能的markdown包裹
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent
          .replace(/```json\s*/g, "")
          .replace(/```\s*$/g, "");
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.replace(/```\s*/g, "");
      }

      const result = JSON.parse(cleanContent);

      console.log(`✅ Earnings summary: ${result.sentiment || "neutral"}`);

      res.json({
        success: true,
        ticker,
        summary: result.summary || "Analysis completed",
        issues: Array.isArray(result.issues) ? result.issues : [],
        sentiment: result.sentiment || "neutral",
      });
    } catch (error) {
      console.error("❌ Earnings summary error:", error);
      res.json({
        success: true,
        summary: "Analysis failed",
        issues: [],
        sentiment: "neutral",
      });
    }
  });

  // ========== 股票推荐 API - 修复 JSON 解析 ==========
  apiRouter.post("/recommend-stocks", async (req, res) => {
    console.log("🤖 /api/recommend-stocks called");

    try {
      const { industry } = req.body;

      if (!industry || typeof industry !== "string") {
        return res.status(400).json({
          success: false,
          error: "Valid industry is required",
        });
      }

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockRecommendStocks(industry));
      }

      console.log(`📊 Requesting stock recommendations for: ${industry}`);

      if (!process.env.PERPLEXITY_API_KEY) {
        console.error("❌ PERPLEXITY_API_KEY not configured");
        return res.status(503).json({
          success: false,
          error: "Perplexity API not configured",
        });
      }

      // ✅ 改进的提示词 - 要求更清晰的 JSON 格式
      const prompt = `Recommend 3 stocks in ${industry} sector for 2025.

      Return ONLY a JSON array, nothing else. No markdown, no explanation.
      Keep rationale under 50 words, no quotes or special characters inside.

      Example format:
      [
        {"symbol": "AAPL", "name": "Apple Inc", "rationale": "Strong revenue growth and services expansion"},
        {"symbol": "MSFT", "name": "Microsoft", "rationale": "Cloud dominance and AI integration"},
        {"symbol": "GOOGL", "name": "Alphabet", "rationale": "Search monopoly and emerging AI"}
      ]`;

      console.log("🤖 Calling Perplexity API with sonar-pro...");

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: "sonar-pro",
            messages: [
              {
                role: "system",
                content:
                  "You are a financial analyst. Return JSON data as requested, followed by any additional text.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 1500,
            temperature: 0.1,
            search_recency_filter: "month",
            return_related_questions: false,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Perplexity API error:", errorText);
        throw new Error(`Perplexity API failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || "";

      // ✅ 打印完整响应以便调试
      console.log("🤖 Full AI Response:");
      console.log("==================");
      console.log(aiResponse);
      console.log("==================");

      let recommendations: any[] = [];
      let summary = "";

      try {
        // ✅ 更健壮的 JSON 提取
        // 1. 先尝试移除 markdown 代码块
        let cleanedResponse = aiResponse
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();

        // 2. 提取 JSON 数组
        const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          console.log("📋 Extracted JSON string:");
          console.log(jsonStr);

          try {
            recommendations = JSON.parse(jsonStr);
            console.log(`✅ Parsed ${recommendations.length} recommendations`);

            // ✅ 验证每个推荐的结构
            recommendations = recommendations.map((rec, index) => {
              if (!rec.symbol || !rec.name || !rec.rationale) {
                console.warn(`⚠️ Incomplete recommendation ${index + 1}:`, rec);
              }

              return {
                symbol: (rec.symbol || "N/A").trim(),
                name: (rec.name || "Unknown Company").trim(),
                rationale: (
                  rec.rationale || "Strong fundamentals and growth potential."
                ).trim(),
              };
            });
          } catch (jsonError) {
            console.error("❌ JSON parse error:", jsonError);
            console.log("Attempting manual parsing...");
            recommendations = parseRecommendationsManually(aiResponse);
          }

          // 提取总结（JSON 后面的文本）
          const afterJson = aiResponse
            .substring(jsonMatch.index! + jsonMatch[0].length)
            .trim();
          summary =
            afterJson
              .replace(/```/g, "")
              .replace(/^[\s\n\-:"\}\]]+/, "")
              .trim()
              .split("\n")[0] || "Market analysis complete.";
          ("Market analysis complete.");
        } else {
          console.warn("⚠️ No JSON array found in response");
          recommendations = parseRecommendationsManually(aiResponse);
          summary = "Stock recommendations based on market analysis.";
        }
      } catch (parseError) {
        console.error("❌ Parsing error:", parseError);
        recommendations = parseRecommendationsManually(aiResponse);
        summary = "Stock recommendations based on market analysis.";
      }

      // ✅ 最终验证
      if (!recommendations || recommendations.length === 0) {
        throw new Error("No valid recommendations generated");
      }

      // 确保只有 3 个推荐
      recommendations = recommendations.slice(0, 3);

      console.log("✅ Final recommendations:");
      recommendations.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec.symbol} - ${rec.name}`);
        console.log(`     ${rec.rationale.substring(0, 80)}...`);
      });

      res.json({
        success: true,
        industry,
        recommendations,
        summary,
        timestamp: new Date().toISOString(),
        source: "Perplexity AI (sonar-pro)",
      });
    } catch (error) {
      console.error("❌ Recommendation error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to generate recommendations",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  apiRouter.post("/general-qa", async (req, res) => {
    console.log("💬 /api/general-qa called");

    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({
          success: false,
          error: "Valid query is required",
        });
      }

      console.log(`🤖 Processing general question: "${query}"`);

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockGeneralQa(query));
      }

      if (!PERPLEXITY_API_KEY) {
        return res.status(503).json({
          success: false,
          error: "Perplexity API not configured",
        });
      }

      const response = await fetch(
        "https://api.perplexity.ai/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          },
          body: JSON.stringify({
            model: "sonar", // 带在线搜索
            messages: [
              {
                role: "user",
                content: query,
              },
            ],
            temperature: 0.2,
            max_tokens: 800,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Perplexity API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error("Empty response from Perplexity");
      }

      console.log("✅ General Q&A completed");

      // Markdown转HTML
      const formattedAnswer = answer
        .replace(/\[\d+\]/g, "") // 加这行，去掉 [1] [2] 等
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");

      res.json({
        success: true,
        query,
        answer: `<strong>💡 Answer</strong><br><br>${formattedAnswer}`,
        citations: data.citations || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ General Q&A error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process question",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== Earnings Fallback API (DeepSeek) ==========
  apiRouter.post("/earnings-fallback", async (req, res) => {
    console.log("🔄 /api/earnings-fallback called (DeepSeek)");

    try {
      const { query } = req.body;

      if (!query || typeof query !== "string") {
        return res.status(400).json({
          success: false,
          error: "Valid query is required",
        });
      }

      console.log(`🤖 Using DeepSeek for earnings analysis: "${query}"`);

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockEarningsFallback(query));
      }

      if (!DEEPSEEK_API_KEY) {
        return res.status(503).json({
          success: false,
          error: "DeepSeek API not configured",
        });
      }

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            temperature: 0.3,
            max_tokens: 1200,
            messages: [
              {
                role: "system",
                content: `You are an expert earnings analyst for Checkit Analytics.

  When analyzing earnings, provide comprehensive insights including:
  1. **Revenue & Growth**: Key revenue figures and growth rates
  2. **Profitability**: Margins, net income, EPS trends
  3. **Guidance**: Management outlook and guidance updates
  4. **Key Metrics**: Important KPIs specific to the company/industry
  5. **Risks & Opportunities**: Major concerns and growth drivers

  Format your response with HTML:
  - Use <strong> for headers and important figures
  - Use <br> for line breaks
  - Include bullet points with • symbol
  - Highlight key numbers with bold
  - Keep response focused and data-driven

  If you don't have specific recent data, provide:
  - General analysis framework for the company/sector
  - What investors should look for in their earnings
  - Historical patterns and typical performance metrics
  - Industry-specific considerations`,
              },
              {
                role: "user",
                content: query,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error("Empty response from DeepSeek");
      }

      console.log("✅ DeepSeek earnings analysis completed");

      // 格式化响应
      const formattedResponse = `<strong>📞 Earnings Analysis</strong><br><br>

  <div style="padding: 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
       border-left: 4px solid #f59e0b; border-radius: 8px; margin-bottom: 16px;">
    <strong style="color: #92400e;">ℹ️ AI-Generated Analysis</strong><br>
    <span style="font-size: 0.9em; color: #78350f;">
      Real-time earnings data is temporarily unavailable. This analysis is based on historical patterns and market knowledge.
    </span>
  </div>

  ${aiResponse}

  <div style="margin-top: 20px; padding: 12px; background: #eff6ff; 
       border-radius: 8px; border-left: 4px solid #3b82f6;">
    <strong>💡 For Latest Earnings Data:</strong><br>
    • Check the company's investor relations page<br>
    • Visit SEC EDGAR for official filings<br>
    • Use financial platforms like Yahoo Finance or Seeking Alpha
  </div>`;

      res.json({
        success: true,
        query,
        response: formattedResponse,
        provider: "deepseek",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Earnings fallback error:", error);

      res.status(500).json({
        success: false,
        error: "Failed to generate earnings analysis",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // ========== Translation API Route ==========
  apiRouter.post("/translate", async (req, res) => {
    console.log("🌐 /api/translate called");

    try {
      const { text, targetLanguage = "zh-CN" } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Valid text is required for translation",
        });
      }

      console.log("🤖 Translating text to:", targetLanguage);

      if (MOCK_MODE) {
        return res.json(mockHandlers.mockTranslate(text, targetLanguage));
      }

      // ✅ 改用DeepSeek
      if (!DEEPSEEK_API_KEY) {
        return res.status(503).json({
          success: false,
          error: "DeepSeek API not configured",
        });
      }

      const languageMap: { [key: string]: string } = {
        "zh-CN": "Simplified Chinese",
        en: "English",
      };

      const targetLanguageName = languageMap[targetLanguage] || "English";

      const response = await fetch(
        "https://api.deepseek.com/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            temperature: 0.7,
            max_tokens: 2000,
            messages: [
              {
                role: "system",
                content: `You are a professional translator. Translate the following text to ${targetLanguageName}. Maintain the original formatting, HTML tags, and structure. Return ONLY the translated text without any explanations.`,
              },
              {
                role: "user",
                content: text,
              },
            ],
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepSeek API error: ${response.status} - ${errorText}`);
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      const translatedText = data.choices[0]?.message?.content;

      if (!translatedText) {
        console.warn("Empty response from DeepSeek, returning original text");
        return res.json({
          success: true,
          translatedText: text,
          originalText: text,
          targetLanguage,
          fallback: true,
        });
      }

      console.log("✅ Translation completed");

      res.json({
        success: true,
        translatedText,
        originalText: text,
        targetLanguage,
      });
    } catch (error) {
      console.error("❌ Translation error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      // Fallback: return original text instead of failing completely
      console.log("🔄 Falling back to original text");
      res.json({
        success: true,
        translatedText: text,
        originalText: text,
        targetLanguage,
        fallback: true,
        error: errorMessage,
      });
    }
  });

  // ✅ 改进的手动解析函数 (保持不变)
  function parseRecommendationsManually(text: string): any[] {
    console.log("🔧 Starting manual parsing...");

    const recommendations: any[] = [];
    const lines = text.split("\n").filter((line) => line.trim());

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 匹配包含股票代码的行
      const tickerMatch = line.match(/\b([A-Z]{2,5})\b/);

      if (tickerMatch) {
        const symbol = tickerMatch[1];

        // 尝试提取公司名称
        let name = symbol;
        const namePatterns = [
          /\(([^)]+)\)/, // (Company Name)
          /[A-Z]{2,5}\s*[-:]\s*([^,\n]+)/, // AAPL - Company Name
          /[A-Z]{2,5}\s+([A-Z][a-zA-Z\s&.]+?)(?:\s*[-:]|$)/, // AAPL Company Name Inc.
        ];

        for (const pattern of namePatterns) {
          const match = line.match(pattern);
          if (match && match[1]) {
            name = match[1].trim();
            break;
          }
        }

        // 尝试获取理由（当前行或下一行）
        let rationale = "";
        const rationaleMatch = line.match(/[:|\-]\s*(.+)$/);
        if (rationaleMatch) {
          rationale = rationaleMatch[1].trim();
        } else if (i + 1 < lines.length) {
          rationale = lines[i + 1].trim();
        }

        // 如果理由太短，尝试获取更多内容
        if (rationale.length < 20 && i + 2 < lines.length) {
          rationale += " " + lines[i + 2].trim();
        }

        if (!rationale) {
          rationale = "Strong fundamentals and growth potential.";
        }

        recommendations.push({
          symbol,
          name,
          rationale: rationale.substring(0, 200), // 限制长度
        });

        // 找到 3 个就停止
        if (recommendations.length >= 3) {
          break;
        }
      }
    }

    console.log(
      `🔧 Manual parsing found ${recommendations.length} recommendations`,
    );
    return recommendations;
  }

  function extractCompanyName(text: string): string | null {
    const nameMatch = text.match(/\(([^)]+)\)/);
    if (nameMatch) return nameMatch[1].trim();

    const colonMatch = text.match(/^([^:]+):/);
    if (colonMatch) return colonMatch[1].trim();

    return null;
  }

  // ========== 统一 Earnings 查询 API ==========
  // 把这段代码加到 routes.ts 里，放在 app.use("/api", apiRouter) 之前

  apiRouter.post("/earnings/query", async (req, res) => {
    console.log("📊 /api/earnings/query called");

    try {
      const { ticker, year, quarter, topic = "summary" } = req.body;
      const lang = "en"; // 固定英文

      // ============================================
      // 参数验证
      // ============================================

      if (!ticker || typeof ticker !== "string") {
        return res.status(400).json({
          success: false,
          error: "ticker is required (e.g., 'TSLA', 'AAPL')",
        });
      }

      if (!year || typeof year !== "number") {
        return res.status(400).json({
          success: false,
          error: "year is required (e.g., 2024)",
        });
      }

      if (
        !quarter ||
        typeof quarter !== "number" ||
        quarter < 1 ||
        quarter > 4
      ) {
        return res.status(400).json({
          success: false,
          error: "quarter is required (1-4)",
        });
      }

      const validTopics = ["summary", "qa", "transcript"];
      if (!validTopics.includes(topic)) {
        return res.status(400).json({
          success: false,
          error: "topic must be one of: summary, qa, transcript",
        });
      }

      const upperTicker = ticker.toUpperCase();
      console.log(
        `📋 Request: ticker=${upperTicker}, Q${quarter} ${year}, topic=${topic}, lang=${lang}`,
      );

      // ============================================
      // 根据 topic 获取数据
      // ============================================

      const API_BASE = "https://smartnews.checkitanalytics.com";
      let data: any = null;

      if (MOCK_MODE) {
        return res.json(
          mockHandlers.mockEarningsQuery(upperTicker, year, quarter, topic),
        );
      }

      if (topic === "transcript") {
        const response = await fetch(
          `${API_BASE}/api/ninjas/transcript?ticker=${upperTicker}&year=${year}&quarter=Q${quarter}`,
        );

        if (!response.ok) {
          return res.status(404).json({
            success: false,
            error: `Transcript not found for ${upperTicker} Q${quarter} ${year}`,
          });
        }

        const result = await response.json();
        if (!result.success) {
          return res.status(404).json({
            success: false,
            error: result.error || "Failed to fetch transcript",
          });
        }

        data = {
          metadata: result.metadata,
          participants: result.participants || [],
          transcript_split: result.transcriptSplit || [],
        };
      } else {
        // summary 或 qa
        const response = await fetch(
          `${API_BASE}/api/earnings/ai-doc?ticker=${upperTicker}&year=${year}&quarter=Q${quarter}&docType=${topic}&lang=${lang}`,
        );

        if (!response.ok) {
          return res.status(404).json({
            success: false,
            error: `${topic} not found for ${upperTicker} Q${quarter} ${year}`,
          });
        }

        const result = await response.json();

        if (!result.success) {
          if (
            result.error?.includes("generating") ||
            result.error?.includes("请稍后")
          ) {
            return res.json({
              success: false,
              status: "generating",
              message:
                "Document is being generated, please try again in a few minutes.",
            });
          }
          return res.status(404).json({
            success: false,
            error: result.error || `Failed to fetch ${topic}`,
          });
        }

        // 只返回核心数据
        data = result.data?.sections || result.data;
      }

      // ============================================
      // 返回简洁的 JSON 结果
      // ============================================

      res.json({
        success: true,
        ticker: upperTicker,
        year,
        quarter,
        topic,
        data,
      });
    } catch (error) {
      console.error("❌ Earnings query error:", error);

      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.use("/api", apiRouter);

  const httpServer = createServer(app);

  return httpServer;
}
