import logoImage from "@assets/logo_1756531121148.png";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Menu, X } from "lucide-react";
import { useState, useRef, useEffect } from "react"; // ✅ 添加 useEffect

// 或者简单点,直接用空字符串(相对路径)
const LOCAL_API_BASE_URL = ""; // ✅ 使用相对路径,自动用当前域名

// ✅ 外部 API (search-news, rag-search)
const API_BASE_URL = "https://smartnews.checkitanalytics.com";

interface WorkflowStep {
  number: number;
  title: string;
  status: "pending" | "active" | "completed";
}

interface Message {
  id: number;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  showIndustrySelector?: boolean;
  contentEn?: string; // English version
  contentZh?: string; // Chinese version
  modules?: string[]; // Relevant modules for follow-up
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  pe: number;
  dcfValue: number;
  recommendation: string;
}

const Home = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      content:
        '<strong>Hello!</strong><br>I am your personal equity research analyst. Try asking questions like:<br>• "What\'s the latest news on Apple?"<br>• "Tesla earnings preview"<br>• "What\'s Microsoft\'s fair value?"<br>• "rumor check: Is Qualcomm going to acquire Intel?"<br>• "Show me Q3 2025 earning call summary for Rivian"<br>• "Which stocks are undervalued?"<br>• "Can I still buy Tesla stock now?"<br>• "Why Intel stock jump today?"',
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Store all timeout IDs to clear them when needed
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isQueryInChineseRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null); // ✅ 添加

  // ✅ 添加自动滚动
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // 每次消息更新时滚动

  // Reset function to start over
  const handleStartOver = () => {
    // Clear all running timeouts
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current = [];

    // Reset the Chinese query ref
    isQueryInChineseRef.current = false;

    setCurrentStep(0);
    setSelectedIndustry("");
    setStockSelectionMode(false);
    setIsLoading(false);
    setInputValue("");
    setIsGreetingCollapsed(false); // 重置提示框状态
    setMessages([
      {
        id: 1,
        content:
          '<strong>Hello!</strong><br>I am your personal equity research analyst. Try asking questions like:<br>• "What\'s the latest news on Apple?"<br>• "Tesla earnings summary"<br>• "What\'s Microsoft\'s fair value?"<br>• "rumor check: Is Qualcomm going to acquire Intel?"<br>• "Show me Q3 2025 earning call summary for Rivian"<br>• "Which stocks are undervalued?"<br>• "Can I still buy Tesla stock now?"<br>• "Why Intel stock jump today?"',
        sender: "agent",
        timestamp: new Date(),
      },
    ]);
  };

  // Base workflow steps
  const baseSteps = [
    { id: 0, title: "Disclaimer", desc: "This is not financial advice." },
    {
      id: 1,
      title: "Introduction",
      desc: "Frame the key factors of the decision.",
    },
    {
      id: 2,
      title: "Intelligent News Analytics",
      desc: "Search and analyze the latest relevant stock news",
    },
    {
      id: 3,
      title: "Data Analytics",
      desc: "Gather and process relevant datasets",
    },
    { id: 4, title: "Earnings", desc: "Analyze call transcripts" },
    { id: 5, title: "Valuation Model Selection", desc: "Run valuation model" },
    { id: 6, title: "Observations", desc: "Summarize insights" },
    { id: 7, title: "Summary", desc: "Provide a balanced conclusion." },
  ];

  // Extra steps for stock selection
  const stockSelectionExtras = [
    { id: 1, title: "Industry", desc: "Select sector & initial query" },
    { id: 2, title: "Hot Picks", desc: "Search trending stocks" },
  ];

  // Determine if we're in stock selection mode (when user asks for stock recommendations)
  const [stockSelectionMode, setStockSelectionMode] = useState(false);

  // Dynamic steps based on mode
  const workflowSteps = stockSelectionMode
    ? [baseSteps[0], ...stockSelectionExtras, ...baseSteps.slice(1)]
    : baseSteps;

  const getStepDescription = (stepIndex: number) => {
    const step = workflowSteps[stepIndex];
    if (!step)
      return "Welcome! I'm your AI Equity Research Analyst. Ask me about investment opportunities to get started.";

    // Custom descriptions for better user experience
    const descriptions: Record<string, string> = {
      Disclaimer:
        "Important: This analysis is for informational purposes only and should not be considered as financial advice. Please consult with a qualified financial advisor before making investment decisions.",
      Industry:
        "Select an industry sector to begin your equity research analysis. I'll help you find the best investment opportunities.",
      "Hot Picks":
        "I'm searching for trending stocks in your selected industry based on market momentum and fundamental indicators.",
      Introduction:
        "I'm framing the key factors and decision criteria for this investment analysis based on your requirements.",
      "Intelligent News Analytics":
        "Searching and analyzing the latest relevant stock news to understand market sentiment and recent developments.",
      "Data Analytics":
        "Gathering and processing relevant financial datasets, market data, and performance metrics.",
      Earnings:
        "Analyzing latest earnings call transcripts to understand management guidance and financial performance.",
      "Valuation Model Selection":
        "Running comprehensive valuation models (DCF, P/E, PEG) to determine intrinsic value and identify opportunities.",
      Observations:
        "Summarizing key insights from the analysis including strengths, risks, and market opportunities.",
      Summary:
        "Providing a balanced conclusion with investment recommendations based on all research findings.",
    };

    return descriptions[step.title] || step.desc;
  };

  const progressPercent =
    currentStep > 0 ? (currentStep / (workflowSteps.length - 1)) * 100 : 0;

  const industries = [
    "Technology",
    "Healthcare",
    "FinTech",
    "Energy",
    "Consumer Goods",
    "Banking",
    "Real Estate",
    "Utilities",
    "Telecommunications",
    "Materials",
    "EV",
    "Robotaxi",
    "Solar",
    "BioTech",
    "Mega7",
    "Semi-conduct",
    "Airlines",
    "SaaS",
    "AI",
    "eVTOL",
    "Drone",
  ];

  const sampleStocks: Record<string, StockData[]> = {
    Technology: [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 175.23,
        pe: 28.5,
        dcfValue: 190.5,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        price: 332.89,
        pe: 32.1,
        dcfValue: 345.2,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        price: 134.56,
        pe: 24.8,
        dcfValue: 145.3,
        recommendation: "UNDERVALUED",
      },
    ],
    Healthcare: [
      {
        symbol: "JNJ",
        name: "Johnson & Johnson",
        price: 164.78,
        pe: 22.3,
        dcfValue: 172.4,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "PFE",
        name: "Pfizer Inc.",
        price: 42.15,
        pe: 18.7,
        dcfValue: 48.6,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "UNH",
        name: "UnitedHealth Group",
        price: 456.23,
        pe: 26.4,
        dcfValue: 475.8,
        recommendation: "UNDERVALUED",
      },
    ],
    Finance: [
      {
        symbol: "JPM",
        name: "JPMorgan Chase",
        price: 142.67,
        pe: 12.8,
        dcfValue: 155.9,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "BAC",
        name: "Bank of America",
        price: 34.89,
        pe: 11.5,
        dcfValue: 38.2,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "WFC",
        name: "Wells Fargo",
        price: 45.12,
        pe: 13.2,
        dcfValue: 49.8,
        recommendation: "UNDERVALUED",
      },
    ],
    Energy: [
      {
        symbol: "XOM",
        name: "Exxon Mobil",
        price: 89.34,
        pe: 15.2,
        dcfValue: 95.7,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "CVX",
        name: "Chevron Corp.",
        price: 142.56,
        pe: 14.8,
        dcfValue: 148.9,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "COP",
        name: "ConocoPhillips",
        price: 98.12,
        pe: 12.9,
        dcfValue: 105.3,
        recommendation: "UNDERVALUED",
      },
    ],
    Default: [
      {
        symbol: "AAPL",
        name: "Apple Inc.",
        price: 175.23,
        pe: 28.5,
        dcfValue: 190.5,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        price: 332.89,
        pe: 32.1,
        dcfValue: 345.2,
        recommendation: "UNDERVALUED",
      },
      {
        symbol: "GOOGL",
        name: "Alphabet Inc.",
        price: 134.56,
        pe: 24.8,
        dcfValue: 145.3,
        recommendation: "UNDERVALUED",
      },
    ],
  };

  // Helper function to detect if text contains Chinese characters
  const isChinese = (text: string) => {
    return /[\u4e00-\u9fa5]/.test(text);
  };

  // Module metadata for follow-up suggestions
  const MODULE_META: Record<
    string,
    { label: string; labelZh: string; url: string; icon: string }
  > = {
    news: {
      label: "Intelligent News Analyst",
      labelZh: "智能新闻分析师",
      url: "https://smartnews.checkitanalytics.com/",
      icon: "📰",
    },
    earnings: {
      label: "Earnings Analyst",
      labelZh: "财报分析师",
      url: "https://smartnews.checkitanalytics.com/rag",
      icon: "💵",
    },
    valuation: {
      label: "Valuation Expert",
      labelZh: "估值专家",
      url: "https://valuation.checkitanalytics.com/",
      icon: "💰",
    },
    data: {
      label: "Data Analyst",
      labelZh: "数据分析师",
      url: "https://keymetrics.checkitanalytics.com/",
      icon: "📊",
    },
    fda: {
      label: "FDA Calendar",
      labelZh: "FDA日历",
      url: "https://fdacalendar.checkitanalytics.com/",
      icon: "📅",
    },
    StockPicker: {
      label: "Stock Picker",
      labelZh: "智能选股",
      // url: "https://checkitanalytics.com/ev-news/",
      icon: "🚗",
    },
  };

  // Helper function to create agent message with translation
  const createAgentMessage = async (
    content: string,
    modules?: string[],
  ): Promise<Message> => {
    let messageContent = content;
    let contentEn = content;
    let contentZh: string | undefined = undefined;

    // If original query was in Chinese, translate response to Chinese
    if (isQueryInChineseRef.current) {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: content,
            targetLanguage: "zh-CN",
          }),
        });
        const data = await response.json();
        if (data.success) {
          messageContent = data.translatedText;
          contentZh = data.translatedText;
        }
      } catch (error) {
        console.error("Translation error:", error);
      }
    }

    return {
      id: Date.now(),
      content: messageContent,
      sender: "agent",
      timestamp: new Date(),
      contentEn,
      contentZh,
      modules,
    };
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const originalInput = inputValue;
    const isInputChinese = isChinese(originalInput);

    // Set the ref immediately for synchronous access
    isQueryInChineseRef.current = isInputChinese;

    // 在这里添加这一行，自动收起提示框
    setIsGreetingCollapsed(true);

    // If input is in Chinese, translate to English first
    let englishQuery = originalInput;
    if (isInputChinese) {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: originalInput,
            targetLanguage: "en",
          }),
        });
        const data = await response.json();
        if (data.success) {
          englishQuery = data.translatedText;
        }
      } catch (error) {
        console.error("Translation error:", error);
      }
    }

    // Create user message with both versions if Chinese
    const userMessage: Message = {
      id: messages.length + 1,
      content: originalInput,
      sender: "user",
      timestamp: new Date(),
      contentEn: isInputChinese ? englishQuery : originalInput,
      contentZh: isInputChinese ? originalInput : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Process with English query
    handleUserMessage(englishQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  // Intent-based workflow router function
  const routeEquityResearchIntent = (userInput: string) => {
    const text = (userInput || "").toLowerCase();

    // News/Rumor/Product trigger words per specification
    const newsKeywords = [
      "news",
      "headline",
      "rumor",
      "hearsay",
      "leak",
      "product",
      "launch",
      "unveil",
      "release",
      "event",
      "partnership",
      "acquisition",
      "m&a",
      "divest",
      "recall",
      "lawsuit",
      "regulatory",
      "sec",
      "management change",
      "ceo",
      "cfo",
      "layoff",
      "hiring",
      "expansion",
      "market entry",
      "technology",
      "prototype",
    ];

    // Earnings/Financial trigger words per specification
    const earningsKeywords = [
      "earnings",
      "earning call",
      "guidance",
      "outlook",
      "gaap",
      "non-gaap",
      "preview",
      "transcript",
      "q&a",
    ];

    // 新增：Performance/Metrics trigger words
    const performanceKeywords = [
      "performance",
      "how is",
      "how's",
      "doing",
      "metrics",
      "financial data",
      "key metrics",
      "compare",
      "comparison",
      "peer",
      "competitor",
      "vs",
      "versus",
    ];

    const matchesAny = (arr: string[]) => arr.some((k) => text.includes(k));

    const isNews = matchesAny(newsKeywords);
    const isEarnings = matchesAny(earningsKeywords);
    const isPerformance = matchesAny(performanceKeywords); // 新增

    // Tie-breaker: Earnings wins if both match
    if (isPerformance) {
      return "PERFORMANCE";
    } else if (isEarnings || (isNews && isEarnings)) {
      return "EARNINGS";
    } else if (isNews) {
      return "NEWS";
    } else {
      return "NEWS_DEFAULT";
    }
  };

  // Function to handle intelligent news brief API calls
  const handleNewsAnalysis = async (query: string) => {
    try {
      // Add loading message for news analysis
      const loadingMsg = await createAgentMessage(
        `<strong>🎯 Intent Detected</strong><br>I've identified your query as an Intelligent Stock News Analyst request. Analyzing the latest news for you...`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      console.log("About to call API with query:", query);

      // Call the news search API endpoint
      const response = await fetch(`${API_BASE_URL}/api/search-news-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          language: "en",
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const newsData = await response.json();

      // Format the news response
      let content: string;

      if (newsData.error) {
        content = `<strong>❌ Error</strong><br>Failed to fetch news: ${newsData.error}`;
      } else if (newsData.newsContent) {
        content = `<strong>📰 Latest News Analysis</strong><br><br>`;

        let formattedText = newsData.newsContent;

        // 1. 删除底部 Sources
        formattedText = formattedText
          .replace(/📚 Sources:[\s\S]*$/i, "")
          .trim();

        // 2. 压缩空行
        formattedText = formattedText.replace(/\n{2,}/g, "\n");

        // 3. 换行转 <br>
        formattedText = formattedText.replace(/\n/g, "<br>");

        // 4. 美化 Source 按钮
        formattedText = formattedText.replace(
          /(?:🔗\s*)?(?:\[)?Source(?:\])?:?\s*(https?:\/\/[^\s<]+)/gi,
          (match: string, url: string) => {
            try {
              const hostname = new URL(url).hostname.replace("www.", "");
              return `<div style="margin: 4px 0; padding: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; text-align: center;">
                <a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 6px 14px; background: white; color: #667eea; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 0.9em;">
                  📰 Read on ${hostname} →
                </a>
              </div>`;
            } catch {
              return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="padding: 5px 10px; background: #007bff; color: white; border-radius: 4px; text-decoration: none; display: inline-block;">🔗 Open Article</a>`;
            }
          },
        );

        content += `<div style="line-height: 1.5;">${formattedText}</div>`;

        // ============ 新增：添加生成简报按钮 ============
        content += `
          <div style="margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%); border-radius: 12px; border: 1px solid #ddd;">
            <p style="margin: 0 0 12px 0; color: #555; font-size: 0.95em;">
              💡 Want a comprehensive analysis with actionable insights?
            </p>
            <button
              id="generate-brief-btn"
              data-query="${encodeURIComponent(query)}"
              data-news-content="${encodeURIComponent(newsData.newsContent)}"
              style="
                padding: 12px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: transform 0.2s, box-shadow 0.2s;
              "
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)';"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';"
            >
              📊 Generate Smart Brief
            </button>
          </div>
        `;
      } else {
        content = `<strong>📰 News Response</strong><br><pre>${JSON.stringify(newsData, null, 2)}</pre>`;
      }

      const resultsMsg = await createAgentMessage(content, ["news"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling news API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to fetch news analysis. ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompetitiveAnalysis = async (
    query: string,
    ticker?: string | null,
    companyName?: string | null,
    industry?: string | null,
  ) => {
    try {
      // 如果没有industry，用默认值
      const selectedIndustry = industry || "Technology";

      // 告诉用户AI选择的结果，并提示可以自定义
      const loadingMsg = await createAgentMessage(
        `<strong>🏭 Competitive Analysis</strong><br>
            Analyzing <strong>${companyName || ticker}</strong>'s market position using Porter's Five Forces...<br><br>
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 6px; margin: 10px 0;">
              <strong style="color: #92400e;">🤖 AI Selected Industry:</strong> <span style="color: #1f2937;">${selectedIndustry}</span><br>
              <span style="font-size: 0.9em; color: #78350f;">💡 Tip: You can specify a different industry, e.g. "Tesla competitive analysis in autonomous driving"</span>
            </div>
            <em>⏱️ This may take 15-30 seconds</em>`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      const response = await fetch(
        `${LOCAL_API_BASE_URL}/api/competitive-analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: companyName || ticker,
            industry: selectedIndustry,
            additionalContext: query,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();

      // 选择语言
      const langData = isQueryInChineseRef.current ? data.zh : data.en;
      const forces = langData?.forces;

      if (!forces) {
        throw new Error("Invalid response format");
      }

      // 构建显示内容
      let content = `
        <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); padding: 16px 20px; color: white;">
            <h3 style="margin: 0;">🏭 ${data.company} - ${isQueryInChineseRef.current ? "行业竞争力分析" : "Competitive Analysis"}</h3>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;">${data.industry}</p>
          </div>

          <div style="padding: 20px;">
            <!-- Overall Assessment -->
            <div style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
              <strong style="color: #0f766e;">${isQueryInChineseRef.current ? "总体评估" : "Overall Assessment"}</strong>
              <p style="margin: 8px 0 0 0; color: #374151; line-height: 1.6;">${langData.overall_assessment}</p>
            </div>

            <!-- Five Forces Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${Object.entries(forces)
                .map(([key, force]: [string, any]) => {
                  const labels: Record<
                    string,
                    { en: string; zh: string; icon: string }
                  > = {
                    competitive_rivalry: {
                      en: "Competitive Rivalry",
                      zh: "竞争对手的竞争",
                      icon: "🔄",
                    },
                    threat_of_new_entrants: {
                      en: "Threat of New Entrants",
                      zh: "新进入者的威胁",
                      icon: "🚪",
                    },
                    threat_of_substitutes: {
                      en: "Threat of Substitutes",
                      zh: "替代品的威胁",
                      icon: "🔀",
                    },
                    supplier_power: {
                      en: "Supplier Power",
                      zh: "供应商议价能力",
                      icon: "💼",
                    },
                    buyer_power: {
                      en: "Buyer Power",
                      zh: "买家议价能力",
                      icon: "🛒",
                    },
                  };
                  const label = labels[key] || { en: key, zh: key, icon: "📊" };
                  const scoreColor =
                    force.score >= 7
                      ? "#ef4444"
                      : force.score >= 4
                        ? "#f59e0b"
                        : "#10b981";

                  return `
                  <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                      <span style="font-weight: 600; color: #374151;">${label.icon} ${isQueryInChineseRef.current ? label.zh : label.en}</span>
                      <span style="background: ${scoreColor}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">${force.score}/10</span>
                    </div>
                    <div style="background: #f3f4f6; border-radius: 4px; height: 8px; margin-bottom: 12px;">
                      <div style="background: ${scoreColor}; height: 100%; border-radius: 4px; width: ${force.score * 10}%;"></div>
                    </div>
                    <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin: 0;">${force.analysis}</p>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
        </div>
      `;

      const resultsMsg = await createAgentMessage(content);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Competitive analysis error:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to analyze competitive position. ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============ 新增：处理生成简报按钮点击 ============
  const handleGenerateSmartBrief = async (
    query: string,
    newsContent: string,
  ) => {
    try {
      setIsLoading(true);

      // 调用 create-smart-brief API（不添加额外的 loading 消息）
      const response = await fetch(`${API_BASE_URL}/api/create-smart-brief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          language: "en",
          newsContent: newsContent,
          includeStockPrice: true,
          tickerSymbol: query.match(/\b([A-Z]{1,5})\b/)?.[1] || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Smart Brief API call failed: ${response.status}`);
      }

      const briefData = await response.json();

      // 格式化智能简报输出
      let briefContent = `<strong>📊 Smart Brief Generated</strong><br><br>`;

      if (briefData.error) {
        briefContent = `<strong>❌ Error</strong><br>Failed to generate smart brief: ${briefData.error}`;
      } else if (briefData.smartBrief) {
        const brief = briefData.smartBrief;

        // 股价信息
        if (brief.ticker && brief.current_price) {
          briefContent += `
            <div style="padding: 12px 16px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 10px; margin-bottom: 16px; color: white;">
              <strong>💰 ${brief.ticker}</strong>: $${brief.current_price} ${brief.currency || "USD"}
            </div>
          `;
        }

        // Actionable Insights
        if (brief.actionable_insights_section) {
          briefContent += `
            <div style="margin-bottom: 16px; padding: 16px; background: #fff8e6; border-left: 4px solid #ffc107; border-radius: 0 8px 8px 0;">
              <strong style="color: #856404;">💡 Actionable Insights</strong>
              <div style="margin-top: 10px; line-height: 1.6;">
                ${brief.actionable_insights_section.replace(/\n/g, "<br>")}
              </div>
            </div>
          `;
        }

        // Analysis
        if (brief.analysis_section) {
          briefContent += `
            <div style="margin-bottom: 16px; padding: 16px; background: #e8f4fd; border-left: 4px solid #2196f3; border-radius: 0 8px 8px 0;">
              <strong style="color: #0d47a1;">📊 Analysis</strong>
              <div style="margin-top: 10px; line-height: 1.6;">
                ${brief.analysis_section.replace(/\n/g, "<br>")}
              </div>
            </div>
          `;
        }

        // News (可折叠)
        if (brief.news_section) {
          briefContent += `
            <details style="padding: 16px; background: #f8f9fa; border-radius: 8px;">
              <summary style="cursor: pointer; font-weight: 600;">📰 News <span style="color: #999;">(Click to expand)</span></summary>
              <div style="margin-top: 12px; line-height: 1.6;">
                ${brief.news_section.replace(/\n/g, "<br>")}
              </div>
            </details>
          `;
        }

        // Word count
        if (brief.word_count) {
          briefContent += `<div style="text-align: right; font-size: 0.8em; color: #999; margin-top: 10px;">📝 ${brief.word_count} words</div>`;
        }
      }

      const briefMsg = await createAgentMessage(briefContent, [
        "news",
        "analysis",
      ]);
      setMessages((prev) => [...prev, briefMsg]);
    } catch (error) {
      console.error("Error generating smart brief:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to generate smart brief. ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false); // 确保 loading 状态被重置
    }
  };

  // ============ 新增：监听按钮点击事件 ============
  // 在组件的 useEffect 中添加事件监听器
  useEffect(() => {
    const handleButtonClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // 检查是否点击了生成简报按钮
      if (
        target.id === "generate-brief-btn" ||
        target.closest("#generate-brief-btn")
      ) {
        const button =
          target.id === "generate-brief-btn"
            ? target
            : (target.closest("#generate-brief-btn") as HTMLElement);

        if (button) {
          const query = decodeURIComponent(
            button.getAttribute("data-query") || "",
          );
          const newsContent = decodeURIComponent(
            button.getAttribute("data-news-content") || "",
          );

          if (query && newsContent) {
            // 禁用按钮防止重复点击
            button.setAttribute("disabled", "true");
            button.innerHTML = "⏳ Generating...";
            (button as HTMLButtonElement).style.opacity = "0.7";
            (button as HTMLButtonElement).style.cursor = "not-allowed";

            handleGenerateSmartBrief(query, newsContent);
          }
        }
      }
    };

    document.addEventListener("click", handleButtonClick);

    return () => {
      document.removeEventListener("click", handleButtonClick);
    };
  }, []);

  // ✅ 最简化版: 谣言验证处理函数 - 纯文本显示
  const handleRumorCheck = async (query: string) => {
    try {
      const loadingMsg = await createAgentMessage(
        `<strong>🔍 Rumor Verification</strong><br>Checking the credibility of this claim across multiple sources...<br><br><em>⏱️ Cross-referencing with authoritative sources...</em>`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      console.log("🕵️ Calling rumor detection API for:", query);

      const response = await fetch(`${API_BASE_URL}/api/detect-rumor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: query,
          language: "en",
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const rumorData = await response.json();

      let content = `<strong>🔎 Rumor Verification Report</strong><br><br>`;

      // ✅ 直接显示详细分析 - 无背景色,正常字体
      if (rumorData._analysis?.fullAnalysis) {
        const formattedAnalysis = rumorData._analysis.fullAnalysis.replace(
          /\n/g,
          "<br>",
        );

        content += `<div style="line-height: 1.8;">
          ${formattedAnalysis}
        </div>`;
      }

      const resultsMsg = await createAgentMessage(content, ["news"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling rumor detection API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to verify the rumor. ${error instanceof Error ? error.message : "Unknown error"}<br><br><em>Tip: Try rephrasing like "Rumor check: Is Qualcomm acquiring Intel?" or "Is it true that Apple is buying Disney?"</em>`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 完整的 handlePerformanceAnalysis 函数（包含同行查找）
  const handlePerformanceAnalysis = async (
    query: string,
    aiTicker?: string | null,
    aiCompanyName?: string | null,
  ) => {
    try {
      const loadingMsg = await createAgentMessage(
        `<strong>🎯 Intent Detected</strong><br>I've identified your query as a Performance Analysis request. Fetching financial metrics...`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      let ticker: string;
      let companyName: string;

      // ✅ 优先使用 AI 识别的结果
      if (aiTicker) {
        console.log("✅ Using AI-identified ticker:", aiTicker);
        ticker = aiTicker;
        companyName = aiCompanyName || aiTicker;

        const identifiedMsg = await createAgentMessage(
          `<strong>✅ Company Identified</strong><br>Company: <strong>${companyName}</strong> (${ticker})<br>Finding peer companies...`,
        );
        setMessages((prev) => [...prev, identifiedMsg]);
      } else {
        // ❌ AI 没识别出来,使用正则提取 (降级方案)
        console.log("⚠️ AI didn't identify ticker, using regex extraction");

        let companyInput = "";

        const patterns = [
          /(?:how is|how's|about)\s+([a-zA-Z\s]+?)(?:'s|\s+performance|\s+doing|$)/i,
          /^([a-zA-Z\s]+?)\s+(?:performance|metrics|doing|data)/i,
          /(?:show|get|fetch)\s+(?:me\s+)?([a-zA-Z\s]+?)\s+(?:performance|metrics|data)/i,
        ];

        for (const pattern of patterns) {
          const match = query.match(pattern);
          if (match && match[1]) {
            companyInput = match[1].trim();
            break;
          }
        }

        if (!companyInput) {
          const words = query.split(/\s+/);
          if (words.length > 0) {
            companyInput = words[0].trim();
          }
        }

        if (!companyInput) {
          const helpMsg = await createAgentMessage(
            `<strong>🤔 Need More Info</strong><br>I couldn't identify which company you're asking about. Please try:<br>• "How is Tesla's performance?"<br>• "Show me Apple metrics"<br>• "Rivian data"<br>• Or simply: "TSLA performance"`,
          );
          setMessages((prev) => [...prev, helpMsg]);
          setIsLoading(false);
          return;
        }

        console.log("Extracted company input:", companyInput);

        // Step 2: 调用 resolve API 转换为 ticker
        const resolveResponse = await fetch(
          `https://keymetrics.checkitanalytics.com/api/resolve`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              input: companyInput,
            }),
          },
        );

        if (!resolveResponse.ok) {
          throw new Error(
            `Failed to resolve company: ${resolveResponse.status}`,
          );
        }

        const resolveData = await resolveResponse.json();
        console.log("Resolve result:", resolveData);

        if (resolveData.error) {
          throw new Error(resolveData.error);
        }

        ticker = resolveData.ticker;
        companyName = resolveData.name || ticker;

        const identifiedMsg2 = await createAgentMessage(
          `<strong>✅ Company Identified</strong><br>Company: <strong>${companyName}</strong> (${ticker})<br>Finding peer companies...`,
        );
        setMessages((prev) => [...prev, identifiedMsg2]);
      }

      // ✅ Step 3: 查找同行公司
      console.log("Finding peers for:", ticker);
      const peersResponse = await fetch(
        `https://keymetrics.checkitanalytics.com/api/find-peers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        },
      );

      let peerTickers: string[] = [];
      let peerNames: Record<string, string> = {};

      if (peersResponse.ok) {
        const peersData = await peersResponse.json();
        console.log("Peers found:", peersData);

        if (peersData.peers && peersData.peers.length > 0) {
          // 最多取3个同行公司
          const peersToUse = peersData.peers.slice(0, 3);
          peerTickers = peersToUse.map((p: any) => p.ticker);
          peersToUse.forEach((p: any) => {
            peerNames[p.ticker] = p.name || p.ticker;
          });

          const peersMsg = await createAgentMessage(
            `<strong>🔍 Peer Companies Found</strong><br>Comparing with: ${peersToUse.map((p: any) => `${p.ticker} (${p.name || p.ticker})`).join(", ")}`,
          );
          setMessages((prev) => [...prev, peersMsg]);
        } else {
          console.log(
            "No peers found, continuing with single company analysis",
          );
        }
      } else {
        console.log(
          "Failed to fetch peers, continuing with single company analysis",
        );
      }

      // ✅ Step 4: 获取主公司 + 同行公司的财务数据
      const allTickers = [ticker, ...peerTickers];
      console.log("Fetching metrics for:", allTickers);

      const metricsResponse = await fetch(
        `https://keymetrics.checkitanalytics.com/api/get-metrics`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tickers: allTickers,
          }),
        },
      );

      if (!metricsResponse.ok) {
        throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`);
      }

      const metricsData = await metricsResponse.json();
      console.log("Metrics data:", metricsData);

      const tickerData = metricsData[ticker];

      if (!tickerData || tickerData.error) {
        throw new Error(`No data available for ${ticker}`);
      }

      // 获取所有季度（按时间倒序）
      const quarters = tickerData["Total Revenue"]
        ? Object.keys(tickerData["Total Revenue"]).sort().reverse()
        : [];

      if (quarters.length === 0) {
        throw new Error(`No quarterly data available for ${ticker}`);
      }

      // 获取最近的季度
      const latestQuarter = quarters[0];
      const displayQuarters = quarters.slice(0, 5);

      // ✅ Step 5: 构建包含同行数据的 payload
      const metrics = [
        "Market Cap",
        "Total Revenue",
        "Gross Margin %",
        "Operating Expense",
        "EBIT",
        "Net Income",
        "Free Cash Flow",
      ];

      // 构建 latest_quarter.rows（包含所有公司的数据）
      const lq_rows = metrics.map((metric) => {
        const row: Record<string, any> = { metric };

        // 添加主公司数据
        const key = metric === "Market Cap" ? "Current" : latestQuarter;
        row[ticker] = tickerData[metric]?.[key] ?? null;

        // 添加同行公司数据
        peerTickers.forEach((peerTicker) => {
          const peerData = metricsData[peerTicker];
          if (peerData && !peerData.error) {
            row[peerTicker] = peerData[metric]?.[key] ?? null;
          }
        });

        return row;
      });

      // 构建 time_series.rows（只包含主公司数据）
      const ts_rows = metrics.map((metric) => {
        const values = displayQuarters.map((q) => {
          const val = tickerData[metric]?.[q];
          return val !== undefined ? val : null;
        });
        return { metric, values };
      });

      const conclusionPayload = {
        primary: ticker,
        latest_quarter: {
          period: latestQuarter,
          rows: lq_rows,
        },
        time_series: {
          ticker: ticker,
          quarters: displayQuarters,
          rows: ts_rows,
        },
      };

      console.log(
        "Calling peer-key-metrics-conclusion with payload:",
        conclusionPayload,
      );

      // ✅ Step 6: 调用同行对比分析 API
      const peerAnalysisResponse = await fetch(
        `https://keymetrics.checkitanalytics.com/api/peer-key-metrics-conclusion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(conclusionPayload),
        },
      );

      // 处理同行对比数据
      let peerAnalysisContent = null;
      if (peerAnalysisResponse.ok) {
        const peerAnalysisData = await peerAnalysisResponse.json();
        console.log("Peer analysis response:", peerAnalysisData);

        if (peerAnalysisData.conclusion_en || peerAnalysisData.conclusion_zh) {
          peerAnalysisContent = {
            text: isQueryInChineseRef.current
              ? peerAnalysisData.conclusion_zh || peerAnalysisData.conclusion_en
              : peerAnalysisData.conclusion_en,
            period: peerAnalysisData.period || latestQuarter,
            provider: peerAnalysisData.llm || "analysis",
          };
        }
      }

      // ✅ Step 7: 构建显示内容
      let content = `<strong>📊 Financial Performance - ${companyName} (${ticker})</strong><br><br>`;

      // 如果有同行公司，显示同行信息
      if (peerTickers.length > 0) {
        content += `<div style="
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 16px;
          border-left: 4px solid #f59e0b;
        ">
          <strong style="color: #92400e;">📈 Peer Comparison Enabled</strong><br>
          <span style="font-size: 0.9em; color: #78350f;">
            Comparing with: ${peerTickers.map((t) => `${t} (${peerNames[t] || t})`).join(", ")}
          </span>
        </div>`;
      }

      // 如果有同行对比分析，显示它
      if (peerAnalysisContent && peerAnalysisContent.text) {
        content += `<div style="
          background: linear-gradient(135deg, #f5f3ff 0%, #e9e6ff 100%);
          padding: 18px;
          border-radius: 10px;
          margin-bottom: 24px;
          border-left: 4px solid #6366f1;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.1);
        ">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 1.2em;">🎯</span>
            <strong style="color: #4338ca; font-size: 1.15em;">Primary Company Analysis</strong>
          </div>
          <div style="line-height: 1.8; color: #334155; font-size: 0.95em;">
            ${formatPeerAnalysis(peerAnalysisContent.text)}
          </div>
          <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(99, 102, 241, 0.1); font-size: 0.85em; color: #64748b;">
            <em>Generated by: ${
              peerAnalysisContent.provider === "deepseek"
                ? "DeepSeek"
                : peerAnalysisContent.provider === "perplexity"
                  ? "Perplexity"
                  : "Local Analysis"
            } • Period: ${peerAnalysisContent.period}</em>
          </div>
        </div>`;
      }

      // =====================================================
      // ✅ 新增：Latest Quarter Metrics 表格（横向对比所有公司）
      // =====================================================
      if (peerTickers.length > 0) {
        content += `<div style="margin-bottom: 24px;">`;
        content += `<h3 style="font-size: 1.1em; font-weight: 600; color: #1f2937; margin-bottom: 12px;">📊 Latest Quarter Metrics</h3>`;
        content += `<div style="overflow-x: auto;">`;
        content += `<table style="width: 100%; border-collapse: collapse; font-size: 0.85em; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;

        // 表头：Metric | 主公司 | 同行1 | 同行2 | ...
        content += `<thead><tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">`;
        content += `<th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Metric</th>`;
        content += `<th style="padding: 12px; text-align: right; font-weight: 600; color: #4f46e5;">${ticker}<br><span style="font-size: 0.8em; color: #94a3b8;">${latestQuarter}</span></th>`;
        peerTickers.forEach((peerTicker) => {
          content += `<th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">${peerTicker}<br><span style="font-size: 0.8em; color: #94a3b8;">${latestQuarter}</span></th>`;
        });
        content += `</tr></thead>`;

        // 表体
        content += `<tbody>`;
        const comparisonMetrics = [
          "Market Cap",
          "Total Revenue",
          "Revenue (TTM)",
          "Gross Profit (TTM)",
          "Gross Margin %",
          "Operating Expense",
          "EBIT",
          "Net Income",
          "Net Income (TTM)",
          "Free Cash Flow",
          // Removed "P/E Ratio" and "Price/Sales" here to avoid duplicate rows.
        ];

        comparisonMetrics.forEach((metric, idx) => {
          const bgColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
          content += `<tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">`;
          content += `<td style="padding: 10px 12px; font-weight: 500; color: #374151;">${metric}</td>`;

          // 主公司数据
          const key = metric === "Market Cap" ? "Current" : latestQuarter;
          const primaryValue = tickerData[metric]?.[key];
          content += `<td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #4f46e5;">${formatMetricValue(primaryValue, metric)}</td>`;

          // 同行数据
          peerTickers.forEach((peerTicker) => {
            const peerData = metricsData[peerTicker];
            const peerValue =
              peerData && !peerData.error ? peerData[metric]?.[key] : null;
            content += `<td style="padding: 10px 12px; text-align: right; color: #64748b;">${formatMetricValue(peerValue, metric)}</td>`;
          });

          content += `</tr>`;
        });

        // ✅ 新增：Market Cap/Revenue 和 Market Cap/Net Income 行
        // Market Cap/Revenue
        content += `<tr style="background: #f0fdf4; border-bottom: 1px solid #e5e7eb;">`;
  content += `<td style="padding: 10px 12px; font-weight: 500; color: #374151;">Price/Sales ratio</td>`;

        const primaryMC = tickerData["Market Cap"]?.["Current"];
        const primaryRev = tickerData["Total Revenue"]?.[latestQuarter];
        const primaryMCRev =
          primaryMC && primaryRev && primaryRev !== 0
            ? (primaryMC / primaryRev).toFixed(2)
            : "N/A";
        content += `<td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #4f46e5;">${primaryMCRev}</td>`;

        peerTickers.forEach((peerTicker) => {
          const peerData = metricsData[peerTicker];
          const peerMC = peerData?.["Market Cap"]?.["Current"];
          const peerRev = peerData?.["Total Revenue"]?.[latestQuarter];
          const peerMCRev =
            peerMC && peerRev && peerRev !== 0
              ? (peerMC / peerRev).toFixed(2)
              : "N/A";
          content += `<td style="padding: 10px 12px; text-align: right; color: #64748b;">${peerMCRev}</td>`;
        });
        content += `</tr>`;

        // Market Cap/Net Income
        content += `<tr style="background: #fef3c7; border-bottom: 1px solid #e5e7eb;">`;
  content += `<td style="padding: 10px 12px; font-weight: 500; color: #374151;">P/E ratio</td>`;

        const primaryNI = tickerData["Net Income"]?.[latestQuarter];
        const primaryMCNI =
          primaryMC && primaryNI && primaryNI !== 0
            ? (primaryMC / primaryNI).toFixed(2)
            : "N/A";
        content += `<td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #4f46e5;">${primaryMCNI}</td>`;

        peerTickers.forEach((peerTicker) => {
          const peerData = metricsData[peerTicker];
          const peerMC = peerData?.["Market Cap"]?.["Current"];
          const peerNI = peerData?.["Net Income"]?.[latestQuarter];
          const peerMCNI =
            peerMC && peerNI && peerNI !== 0
              ? (peerMC / peerNI).toFixed(2)
              : "N/A";
          content += `<td style="padding: 10px 12px; text-align: right; color: #64748b;">${peerMCNI}</td>`;
        });
        content += `</tr>`;

        content += `</tbody>`;
        content += `</table>`;
        content += `</div>`;
        content += `</div>`;
      }

      // =====================================================
      // ✅ 原有的：5 Quarter Time Series 表格（纵向展示趋势）
      // =====================================================
      content += `<div style="margin-bottom: 24px;">`;
      content += `<h3 style="font-size: 1.1em; font-weight: 600; color: #1f2937; margin-bottom: 12px;">📈 ${ticker} - 5 Quarter Time Series</h3>`;
      content += `<div style="overflow-x: auto;">`;
      content += `<table style="width: 100%; border-collapse: collapse; font-size: 0.85em; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">`;

      // 表头
      content += `<thead><tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">`;
      content += `<th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;"></th>`;
      displayQuarters.forEach((q) => {
        content += `<th style="padding: 12px; text-align: right; font-weight: 600; color: #475569;">${q}</th>`;
      });
      content += `</tr></thead>`;

      // 表体
      content += `<tbody>`;
      const displayMetrics = [
        "Total Revenue",
        "Operating Expense",
        "Gross Margin %",
        "EBIT",
        "Net Income",
        "Free Cash Flow",
        
      ];

      displayMetrics.forEach((metric, idx) => {
        const bgColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
        content += `<tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">`;
        content += `<td style="padding: 10px 12px; font-weight: 500; color: #374151;">${metric}</td>`;

        displayQuarters.forEach((q) => {
          const value = tickerData[metric]?.[q];
          content += `<td style="padding: 10px 12px; text-align: right; color: #1f2937;">${formatMetricValue(value, metric)}</td>`;
        });

        content += `</tr>`;
      });
      content += `</tbody>`;
      content += `</table>`;
      content += `</div>`;
      content += `</div>`;

      // 添加简单分析
      const latestRevenue = tickerData["Total Revenue"]?.[latestQuarter];
      const latestMargin = tickerData["Gross Margin %"]?.[latestQuarter];
      const latestNetIncome = tickerData["Net Income"]?.[latestQuarter];

      content += `<br><strong>💡 Quick Insights:</strong><br>`;
      content += `• Latest Quarter (${latestQuarter}): `;

      if (latestRevenue !== undefined && latestRevenue !== null) {
        content += `Revenue of $${(latestRevenue / 1_000_000_000).toFixed(2)}B`;
      }

      if (latestMargin !== undefined && latestMargin !== null) {
        content += `, Gross Margin of ${Number(latestMargin).toFixed(1)}%`;
      }

      if (latestNetIncome !== undefined && latestNetIncome !== null) {
        const profitStatus = latestNetIncome >= 0 ? "Profitable" : "Loss";
        content += `<br>• ${profitStatus}: Net Income of $${(latestNetIncome / 1_000_000).toFixed(0)}M`;
      }

      const resultsMsg = await createAgentMessage(content, ["data"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling performance API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to fetch performance data. ${error instanceof Error ? error.message : "Unknown error"}<br><br><em>Tip: Try queries like "How is Tesla's performance?" or "Rivian metrics"</em>`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 格式化同行对比分析的辅助函数（保持不变）
  function formatPeerAnalysis(analysis: any): string {
    if (typeof analysis === "string") {
      return formatTextAnalysis(analysis);
    }

    if (typeof analysis === "object" && analysis !== null) {
      if (analysis.conclusion_en) {
        return formatTextAnalysis(analysis.conclusion_en);
      }
      if (analysis.data) {
        return formatTextAnalysis(analysis.data);
      }
      if (analysis.content) {
        return formatTextAnalysis(analysis.content);
      }

      return `<pre style="font-family: inherit; white-space: pre-wrap;">${JSON.stringify(analysis, null, 2)}</pre>`;
    }

    return "(No analysis data available)";
  }

  // ✅ 辅助函数：格式化文本分析（保持不变）
  function formatTextAnalysis(text: string): string {
    if (!text) return "(No analysis available)";

    return text
      .split("\n")
      .map((line) => {
        if (!line.trim()) return "";

        // 高亮数字和百分比
        line = line.replace(
          /(-?\d+\.?\d*%)/g,
          '<strong style="color: #059669;">$1</strong>',
        );
        line = line.replace(
          /(\$[\d.]+[BMK]+)/g,
          '<strong style="color: #0891b2;">$1</strong>',
        );

        // 处理不  �的行类型
        if (line.includes("Past-performance takeaway")) {
          return `<div style="margin-bottom: 8px;"><strong>📈 ${line}</strong></div>`;
        } else if (
          line.includes("PEER COMPARISON:") ||
          line.includes("►► PEER COMPARISON:")
        ) {
          return `<div style="margin-top: 12px; margin-bottom: 6px;"><strong>🔄 ${line.replace(/►► /, "")}</strong></div>`;
        } else if (
          line.includes("LATEST QUARTER METRICS:") ||
          line.includes("►► LATEST QUARTER METRICS:")
        ) {
          return `<div style="margin-top: 12px; margin-bottom: 6px;"><strong>📊 ${line.replace(/►► /, "")}</strong></div>`;
        } else if (
          line.includes("VALUATION ANALYSIS:") ||
          line.includes("►► VALUATION ANALYSIS:")
        ) {
          return `<div style="margin-top: 12px; margin-bottom: 6px;"><strong>💰 ${line.replace(/►► /, "")}</strong></div>`;
        } else if (line.startsWith("- ") || line.trim().startsWith("• ")) {
          const cleanLine = line.replace(/^[-]\s*/, "").replace(/^[•]\s*/, "");
          return `<div style="margin-left: 12px; margin-top: 4px;">• ${cleanLine}</div>`;
        } else if (line.trim().startsWith("•")) {
          const cleanLine = line.trim().replace(/^[•]\s*/, "");
          return `<div style="margin-left: 24px; margin-top: 2px; font-size: 0.9em;">◦ ${cleanLine}</div>`;
        } else if (line.includes("QoQ") || line.includes("YoY")) {
          return `<div style="margin-left: 16px; margin-top: 4px; color: #7c3aed;">${line}</div>`;
        } else if (line.includes("Overvalued")) {
          line = line.replace(
            /Overvalued/g,
            '<span style="color: #ef4444; font-weight: bold;">Overvalued</span>',
          );
          return `<div style="margin-top: 4px;">${line}</div>`;
        } else if (line.includes("Undervalued")) {
          line = line.replace(
            /Undervalued/g,
            '<span style="color: #10b981; font-weight: bold;">Undervalued</span>',
          );
          return `<div style="margin-top: 4px;">${line}</div>`;
        } else if (line.includes("Inline")) {
          line = line.replace(
            /Inline/g,
            '<span style="color: #f59e0b; font-weight: bold;">Inline</span>',
          );
          return `<div style="margin-top: 4px;">${line}</div>`;
        }

        return `<div style="margin-top: 4px;">${line}</div>`;
      })
      .join("");
  }

  // ✅ 辅助函数：格式化指标数值
  function formatMetricValue(
    value: number | null | undefined,
    metric: string,
  ): string {
    if (value === undefined || value === null) {
      return "N/A";
    }

    if (metric === "Gross Margin %") {
      return Number(value).toFixed(1) + "%";
    }

    // 金额格式化
    const absValue = Math.abs(value);
    const sign = value < 0 ? "-" : "";

    if (absValue >= 1_000_000_000) {
      return `${sign}$${(absValue / 1_000_000_000).toFixed(1)}B`;
    } else if (absValue >= 1_000_000) {
      return `${sign}$${(absValue / 1_000_000).toFixed(0)}M`;
    } else if (absValue >= 1_000) {
      return `${sign}$${(absValue / 1_000).toFixed(0)}K`;
    }

    return `${sign}$${absValue.toFixed(0)}`;
  }

  // 更新的 handleFDAAnalysis 函数，输出格式类似FDA Calendar网站

  const handleFDAAnalysis = async (
    query: string,
    identifier?: string | null,
    identifierType?: string | null,
  ) => {
    try {
      const loadingMsg = await createAgentMessage(
        `<strong>🎯 FDA Analysis</strong><br>Searching FDA database for pharmaceutical information...<br><br><em>⏱️ Analyzing drug recalls, approvals, and regulatory data...</em>`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      console.log("💊 Calling FDA API with:", { identifier, identifierType });

      let fdaData = null;

      // 根据identifier类型调用不同的API
      if (identifier && identifierType) {
        if (identifierType === "ticker") {
          // 直接用ticker查询
          const response = await fetch(
            `${LOCAL_API_BASE_URL}/api/fda/companies/${identifier}`,
          );
          if (response.ok) {
            fdaData = await response.json();
          }
        } else if (identifierType === "company_name") {
          // 先搜索公司
          const searchResponse = await fetch(
            `${LOCAL_API_BASE_URL}/api/fda/companies?company=${encodeURIComponent(identifier)}`,
          );
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            if (searchData.data && searchData.data.length > 0) {
              // 使用第一个搜索结果的ticker
              const ticker = searchData.data[0].ticker;
              const detailResponse = await fetch(
                `${LOCAL_API_BASE_URL}/api/fda/companies/${ticker}`,
              );
              if (detailResponse.ok) {
                fdaData = await detailResponse.json();
              }
            }
          }
        }
      } else {
        // 没有具体公司，获取所有公司统计
        const response = await fetch(`${LOCAL_API_BASE_URL}/api/fda/companies`);
        if (response.ok) {
          const allCompanies = await response.json();
          // 格式化显示前10个公司
          fdaData = {
            success: true,
            query: "all",
            data: allCompanies.data ? allCompanies.data.slice(0, 10) : [],
            totalCompanies: allCompanies.data ? allCompanies.data.length : 0,
          };
        }
      }

      // 格式化显示结果 - 模仿FDA Calendar网站风格
      let content = "";

      if (fdaData && fdaData.success) {
        // 单个公司详情 - 表格式展示
        if (fdaData.data && !Array.isArray(fdaData.data)) {
          const company = fdaData.data[0] || fdaData.data;

          content = `<strong>💊 FDA Drug Pipeline Events</strong><br><br>`;

          // 如果有药物信息，创建表格
          if (company.drugs && company.drugs.length > 0) {
            content += `<div style="background: white; border-radius: 8px; overflow-x: auto;
                  box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;
                  -webkit-overflow-scrolling: touch;">
                <table style="width: 100%; border-collapse: collapse;">
                  <thead>
                    <tr style="background: #eff6ff;">
                      <th style="padding: 10px; text-align: left; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Ticker</th>
                      <th style="padding: 10px; text-align: left; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Company</th>
                      <th style="padding: 10px; text-align: left; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Drug</th>
                      <th style="padding: 10px; text-align: left; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Indication</th>
                      <th style="padding: 10px; text-align: center; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Date</th>
                      <th style="padding: 10px; text-align: center; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Event</th>
                      <th style="padding: 10px; text-align: center; font-weight: 600; color: #1e293b;
                                 border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">Status</th>
                      <th style="padding: 10px; text-align: left; font-weight: 600; color: #1e293b;
                                 border-bottom: 1px solid #e2e8f0;">Event Details</th>
                    </tr>
                  </thead>
                  <tbody>`;

            // 为每个药物创建一行
            company.drugs.forEach((drug: any, idx: number) => {
              const bgColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
              const statusBg =
                drug.status === "APPROVED" ? "#3b82f6" : "#fbbf24";

              // 从eventDetails中提取URL
              let eventUrl = null;
              if (drug.eventDetails) {
                // 匹配URL模式
                const urlMatch = drug.eventDetails.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                  eventUrl = urlMatch[0];
                }
              }

              content += `
                <tr style="background: ${bgColor};">
                  <td style="padding: 10px; font-weight: 600; color: #1e293b;
                             border-right: 1px solid #e2e8f0;">${company.ticker}</td>
                  <td style="padding: 10px; color: #1e293b;
                             border-right: 1px solid #e2e8f0;">${company.company}</td>
                  <td style="padding: 10px; color: #1e293b; font-weight: 500;
                             border-right: 1px solid #e2e8f0;">${drug.drug}</td>
                  <td style="padding: 10px; color: #64748b; font-size: 0.9em;
                             border-right: 1px solid #e2e8f0;">${drug.indication || "N/A"}</td>
                  <td style="padding: 10px; text-align: center; color: #1e293b;
                             border-right: 1px solid #e2e8f0;">${drug.date || company.latestUpdate || "2025-04-30"}</td>
                  <td style="padding: 10px; text-align: center; color: #1e293b; font-size: 0.9em;
                             border-right: 1px solid #e2e8f0;">${drug.event || "FDA Action"}</td>
                  <td style="padding: 10px; text-align: center;
                             border-right: 1px solid #e2e8f0;">
                    <span style="display: inline-block; padding: 4px 12px;
                               background: ${statusBg}; color: white;
                               border-radius: 12px; font-size: 0.85em; font-weight: 600;">
                      ${drug.status || "Pending"}
                    </span>
                  </td>
                  <td style="padding: 10px; font-size: 0.9em;">
                    ${
                      eventUrl
                        ? `<a href="${eventUrl}" target="_blank"
                          style="color: #3b82f6; text-decoration: underline;">
                         View Details
                       </a>`
                        : `<span style="color: #94a3b8;">No details available</span>`
                    }
                  </td>
                </tr>`;
            });

            content += `</tbody>
                </table>
            </div>`;

            // 底部显示信息
            content += `<div style="margin-top: 12px; color: #64748b; font-size: 0.9em;">
              Showing 1 to ${company.drugs.length} of ${company.drugs.length} results
            </div>`;
          } else {
            // 没有药物信息时的提示
            content += `<div style="padding: 16px; background: #f0f9ff; border-left: 4px solid #3b82f6;
                             border-radius: 8px;">
              <strong>ℹ️ No drug pipeline data available for ${company.company}</strong><br>
              <span style="color: #64748b;">This company may not have active FDA submissions.</span>
            </div>`;
          }
        }
        // 多个公司列表 - 类似网站的表格展示
        else if (fdaData.data && Array.isArray(fdaData.data)) {
          // 统计卡片
          content = `<strong>💊 FDA Drug Pipeline Overview</strong><br><br>`;

          content += `<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="background: white; padding: 16px; border-radius: 12px; text-align: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="font-size: 2em; font-weight: bold; color: #3b82f6;">112</div>
              <div style="color: #6b7280; font-size: 0.9em; margin-top: 4px;">Companies Tracked</div>
            </div>
            <div style="background: white; padding: 16px; border-radius: 12px; text-align: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="font-size: 2em; font-weight: bold; color: #10b981;">223</div>
              <div style="color: #6b7280; font-size: 0.9em; margin-top: 4px;">Active Pipelines</div>
            </div>
            <div style="background: white; padding: 16px; border-radius: 12px; text-align: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="font-size: 2em; font-weight: bold; color: #f59e0b;">24</div>
              <div style="color: #6b7280; font-size: 0.9em; margin-top: 4px;">Upcoming Events (30d)</div>
            </div>
            <div style="background: white; padding: 16px; border-radius: 12px; text-align: center;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
              <div style="font-size: 2em; font-weight: bold; color: #7c3aed;">48</div>
              <div style="color: #6b7280; font-size: 0.9em; margin-top: 4px;">Recent Updates (7d)</div>
            </div>
          </div>`;

          // 公司列表表格
          content += `<div style="background: white; border-radius: 12px; overflow: hidden;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <div style="background: #e0f2fe; padding: 12px 16px; border-bottom: 2px solid #3b82f6;">
              <strong style="font-size: 1.1em;">FDA Drug Pipeline Events</strong>
              <span style="float: right; color: #6b7280; font-size: 0.9em;">
                Showing ${fdaData.data.length} of ${fdaData.totalCompanies || fdaData.data.length} results
              </span>
            </div>

            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Ticker</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Company</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Drug</th>
                  <th style="padding: 12px; text-align: left; font-weight: 600; color: #475569;">Indication</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Date</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Event</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; color: #475569;">Status</th>
                </tr>
              </thead>
              <tbody>`;

          fdaData.data.forEach((company: any, idx: number) => {
            const bgColor = idx % 2 === 0 ? "#ffffff" : "#f9fafb";
            const firstDrug =
              company.drugs && company.drugs[0] ? company.drugs[0] : {};

            content += `
              <tr style="background: ${bgColor}; border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px; font-weight: 600; color: #3b82f6;">${company.ticker}</td>
                <td style="padding: 12px; color: #1f2937;">${company.company}</td>
                <td style="padding: 12px; color: #1f2937;">${firstDrug.drug || "N/A"}</td>
                <td style="padding: 12px; color: #6b7280; font-size: 0.9em;">
                  ${firstDrug.indication || "N/A"}
                </td>
                <td style="padding: 12px; text-align: center; color: #1f2937;">
                  ${company.date || company.latestUpdate || "Q4 2025"}
                </td>
                <td style="padding: 12px; text-align: center; color: #1f2937; font-size: 0.9em;">
                  ${firstDrug.event || "FDA decision"}
                </td>
                <td style="padding: 12px; text-align: center;">
                  <span style="display: inline-block; padding: 4px 12px;
                             background: ${firstDrug.status === "APPROVED" ? "#dcfce7" : "#fef3c7"};
                             color: ${firstDrug.status === "APPROVED" ? "#166534" : "#92400e"};
                             border-radius: 12px; font-size: 0.85em; font-weight: 600;">
                    ${firstDrug.status || "Pending"}
                  </span>
                </td>
              </tr>`;
          });

          content += `</tbody></table></div>`;

          // 提示信息
          content += `<div style="margin-top: 20px; padding: 16px; background: #eff6ff;
                            border-radius: 8px; border-left: 4px solid #3b82f6;">
            <em>💡 <strong>Tip:</strong> Ask about a specific company for detailed FDA information.
            <br>Example: "Johnson & Johnson drug recalls" or "PFE FDA approvals"</em>
          </div>`;
        }
      } else {
        content = `<div style="padding: 16px; background: #fee2e2; border-left: 4px solid #ef4444;
                         border-radius: 8px;">
          <strong>⚠️ No FDA data found</strong><br>
          <span style="color: #7f1d1d;">Try searching with a different company name or ticker.</span>
        </div>`;
      }

      const resultsMsg = await createAgentMessage(content, ["fda"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling FDA API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to fetch FDA information. ${error instanceof Error ? error.message : "Unknown error"}<br><br>
        <em>Tip: Try asking about specific pharma companies like "Pfizer drug approvals" or "JNJ recalls"</em>`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewsBriefAnalysis = async (
    query: string,
    ticker?: string | null,
    companyName?: string | null,
  ) => {
    try {
      const loadingMsg = await createAgentMessage(
        `<strong>🎯 Event Analysis</strong><br>Analyzing the specific event or data you asked about...<br><br><em>⏱️ This may take a moment as I search for detailed information</em>`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      console.log("📰 Calling newsbrief API for:", query);

      const response = await fetch(`${API_BASE_URL}/api/newsbrief`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ticker: ticker || null,
          query: query,
          language: "en",
        }),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const newsBriefData = await response.json();

      // ✅ 新样式 - 移动端友好 + 浅蓝/浅紫配色
      let content = `
        <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header - 移动端友好两行布局 -->
          <div style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1em;">📊</span>
                <span style="font-weight: 600; color: #1e40af;">Smart News Brief</span>
              </div>
              <div style="font-size: 0.8em; color: #9ca3af;">
                ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            </div>
            ${
              ticker
                ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
              <span style="font-weight: 600; color: #111; font-size: 1.05em;">${companyName ? `${companyName} (${ticker})` : ticker}</span>
              ${newsBriefData.current_price ? `<span style="color: #059669; font-weight: 600; font-size: 1.05em;">$${newsBriefData.current_price}</span>` : ""}
            </div>
            `
                : ""
            }
          </div>

          <!-- Query -->
          <div style="padding: 8px 16px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;">
            <span style="color: #3b82f6; font-size: 0.9em;">Query: ${query}</span>
          </div>

          <div style="padding: 16px;">
      `;

      if (newsBriefData.news_brief?.smartBrief) {
        const brief = newsBriefData.news_brief.smartBrief;

        // 1️⃣ Actionable Insights - 浅蓝色
        if (brief.actionable_insights_section) {
          content += `
            <div style="margin-bottom: 16px; padding: 14px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <span>💡</span>
                <strong style="color: #1e40af;">Actionable Insights</strong>
              </div>
              <div style="line-height: 1.8; color: #374151; font-size: 0.95em;">
                ${brief.actionable_insights_section.replace(/\n/g, "<br>")}
              </div>
            </div>
          `;
        }

        // 2️⃣ Analysis - 浅紫色
        if (brief.analysis_section) {
          content += `
            <div style="margin-bottom: 16px; padding: 14px; background: #f5f3ff; border-left: 3px solid #8b5cf6; border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
                <span>📈</span>
                <strong style="color: #6d28d9;">Analysis</strong>
              </div>
              <div style="line-height: 1.8; color: #374151; font-size: 0.95em;">
                ${brief.analysis_section.replace(/\n/g, "<br>")}
              </div>
            </div>
          `;
        }

        // 3️⃣ News - 折叠状态 (用 details/summary)
        if (brief.news_section) {
          content += `
            <details style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <summary style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f9fafb; cursor: pointer; list-style: none;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>📰</span>
                  <strong style="color: #4b5563;">News</strong>
                </div>
                <span style="color: #3b82f6; font-size: 0.9em;">Click to expand ›</span>
              </summary>
              <div style="padding: 16px; line-height: 1.8; color: #374151; font-size: 0.95em; border-top: 1px solid #e5e7eb;">
                ${brief.news_section.replace(/\n/g, "<br>")}
              </div>
            </details>
          `;
        }

        // 字数统计
        if (brief.word_count) {
          content += `
            <div style="margin-top: 12px; display: flex; align-items: center; gap: 6px; font-size: 0.85em; color: #9ca3af;">
              <span>📝</span>
              <span>Word count: ${brief.word_count}</span>
            </div>
          `;
        }
      } else if (newsBriefData.error) {
        content += `
          <div style="padding: 12px; background: #fee2e2; border-left: 4px solid #ef4444; border-radius: 6px;">
            <strong>❌ Error:</strong> ${newsBriefData.error}
          </div>
        `;
      } else {
        content += `
          <pre style="background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em;">
            ${JSON.stringify(newsBriefData, null, 2)}
          </pre>
        `;
      }

      content += `
          </div>
        </div>
      `;

      const resultsMsg = await createAgentMessage(content, ["news"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling newsbrief API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to analyze the event. ${error instanceof Error ? error.message : "Unknown error"}<br><br><em>Tip: Try being more specific, like "Why did Intel stock jump today?" or "How many Tesla deliveries in Q3?"</em>`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 重写 handleIndustrySelect
  const handleIndustrySelect = (industry: string) => {
    setSelectedIndustry(industry);

    const industryMessage: Message = {
      id: Date.now(),
      content: `Selected industry: <strong>${industry}</strong>`,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, industryMessage]);

    // ✅ 启动真实筛选工作流
    handleStockScreening(industry);
  };

  const handleStockScreening = async (industry: string) => {
    try {
      setIsLoading(true);

      const startMsg = await createAgentMessage(
        `<strong>🤖 AI Stock Screening</strong><br>Industry: <strong>${industry}</strong><br>`,
      );
      setMessages((prev) => [...prev, startMsg]);

      // Step 1: 获取推荐
      const recommendResponse = await fetch(
        `${LOCAL_API_BASE_URL}/api/recommend-stocks`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ industry }),
        },
      );

      if (!recommendResponse.ok) {
        throw new Error(`API failed: ${recommendResponse.status}`);
      }

      const recommendData = await recommendResponse.json();

      if (!recommendData.success || !recommendData.recommendations) {
        throw new Error("Invalid response");
      }

      const tickers = recommendData.recommendations.map((r: any) => r.symbol);

      // 显示推荐
      const recommendationsHtml = recommendData.recommendations
        .map(
          (rec: any, idx: number) => `
        <div style="margin-bottom: 12px; padding: 12px; background: rgba(255,255,255,0.15); border-radius: 8px;">
          <strong>${idx + 1}. ${rec.symbol} - ${rec.name}</strong><br>
          <span style="font-size: 0.95em;">${rec.rationale}</span>
        </div>
      `,
        )
        .join("");

      const pickerMsg = await createAgentMessage(
        `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px; border-radius: 12px; color: white;">
        <strong style="font-size: 1.1em;">🤖 AI Recommendations - ${industry}</strong><br><br>
        ${recommendationsHtml}
        <div style="margin-top: 10px; font-size: 0.85em; opacity: 0.9;">
          <em>💡 Powered by Perplexity AI</em>
        </div>
      </div>`,
      );
      setMessages((prev) => [...prev, pickerMsg]);

      // Step 2: 并行分析（但串行 a�示）
      const analysisMsg = await createAgentMessage(
        `<strong>⚡ Analysis Started</strong><br>`,
      );
      setMessages((prev) => [...prev, analysisMsg]);

      let successCount = 0;
      let failCount = 0;

      // ✅ 逐个股票处理，但每只股票内部是并行的
      for (const ticker of tickers) {
        try {
          // 显示股票标题
          const headerMsg = await createAgentMessage(
            `<div style="border-top: 3px solid #667eea; padding-top: 16px; margin-top: 20px;">
            <strong>📊 ${ticker} Analysis</strong>
          </div>`,
          );
          setMessages((prev) => [...prev, headerMsg]);

          // ✅ 关键：并行获取该股票的 3 个分析数据
          const [valuationData, redFlagsData, earningsData] = await Promise.all(
            [
              fetchValuationData(ticker),
              fetchRedFlagsData(ticker),
              fetchEarningsData(ticker),
            ],
          );

          // ✅ 串行显示结果（保证顺序）
          if (valuationData) {
            const msg = await createAgentMessage(valuationData);
            setMessages((prev) => [...prev, msg]);
          }

          if (redFlagsData) {
            const msg = await createAgentMessage(redFlagsData);
            setMessages((prev) => [...prev, msg]);
          }

          if (earningsData) {
            const msg = await createAgentMessage(earningsData);
            setMessages((prev) => [...prev, msg]);
          }

          successCount++;
        } catch (error) {
          failCount++;
          console.error(`Failed to analyze ${ticker}:`, error);

          const errorMsg = await createAgentMessage(
            `<strong>⚠️ ${ticker} Analysis Failed</strong><br>Continuing...`,
          );
          setMessages((prev) => [...prev, errorMsg]);
        }
      }

      const finalMsg = await createAgentMessage(
        `<strong>🏆 Complete</strong><br>
      ✅ Analyzed: ${successCount}/${tickers.length} stocks<br>
      ${failCount > 0 ? `⚠️ Failed: ${failCount}` : ""}`,
      );
      setMessages((prev) => [...prev, finalMsg]);
    } catch (error) {
      console.error("Screening error:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Failed</strong><br>${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅  分析析单只股票
  const analyzeSingleStock = async (ticker: string) => {
    const headerMsg = await createAgentMessage(
      `<div style="border-top: 3px solid #667eea; padding-top: 16px; margin-top: 20px;"><strong>📊 ${ticker} Analysis</strong></div>`,
    );
    setMessages((prev) => [...prev, headerMsg]);

    // ② Valuation
    try {
      const valuationResponse = await fetch(
        `${LOCAL_API_BASE_URL}/api/valuation-analysis`, // ✅ 改用 Node.js 端点
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            query: `Valuation analysis for ${ticker}`,
          }), // ✅ 添加 query 参数
        },
      );

      if (valuationResponse.ok) {
        const vData = await valuationResponse.json();

        // --- sanitize fields ---
        const currentPrice = Number(vData.data?.current_price) || 0;
        const targetPrice = Number(vData.data?.target_price) || 0;

        // vData.data.upside_percentage might be "-73.3" or "-73.3%".
        const pctFromAPI = vData.data?.upside_percentage ?? "0";
        const pctSanitized =
          typeof pctFromAPI === "string"
            ? parseFloat(pctFromAPI.replace("%", "").trim())
            : Number(pctFromAPI);

        // Compute from prices as the source of truth when available.
        const pctFromPrices =
          currentPrice > 0
            ? ((targetPrice - currentPrice) / currentPrice) * 100
            : NaN;

        // Choose the most reliable % (prefer price-derived if valid).
        const pct = Number.isFinite(pctFromPrices)
          ? pctFromPrices
          : Number.isFinite(pctSanitized)
            ? pctSanitized
            : 0;

        // Treat tiny negatives as zero to avoid "-0.0% downside"
        const EPS = 1e-6;
        const isDownside = pct < -EPS;
        const isUpside = pct > EPS;

        // status label + color/icon
        const status = isDownside
          ? "OVERVALUED"
          : pct > 5
            ? "UNDERVALUED"
            : "FAIR";
        const color = isDownside ? "#ef4444" : pct > 5 ? "#10b981" : "#f59e0b"; // red | green | amber
        const icon = isDownside ? "⚠️" : pct > 5 ? "✅" : "⚠️";

        // direction word for suffix
        const direction = isDownside ? "downside" : "upside";

        // display value (keep sign, but avoid "-0.0")
        const pctDisplay = Math.abs(pct) < EPS ? 0 : pct;

        const vMsg = await createAgentMessage(
          `<div style="padding: 10px; background: #f9fafb; border-radius: 6px;">
            <strong>💰 Valuation:</strong>
            <span style="color: ${color}; font-weight: 600;">
              ${icon} ${status}
            </span><br>
            $${currentPrice.toFixed(2)} → $${targetPrice.toFixed(2)} (${pctDisplay.toFixed(1)}% ${direction})
          </div>`,
        );
        setMessages((prev) => [...prev, vMsg]);
      }
    } catch (e) {
      console.error(`Valuation error for ${ticker}:`, e);
    }

    // ③ Red Flags
    try {
      const newsResp = await fetch(`${API_BASE_URL}/api/search-news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${ticker} red flag risks issues`,
          language: "en",
        }),
      });

      if (newsResp.ok) {
        const newsData = await newsResp.json();

        if (newsData.newsContent?.length > 50) {
          const flagResp = await fetch(
            `${LOCAL_API_BASE_URL}/api/analyze-redflags`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticker,
                newsContent: newsData.newsContent,
              }),
            },
          );

          if (flagResp.ok) {
            const flagData = await flagResp.json();
            const count = flagData.redflag_count || 0;
            const color = count === 0 ? "#10b981" : "#f59e0b";

            const flagMsg = await createAgentMessage(
              `<div style="padding: 10px; background: #f9fafb; border-radius: 6px;">
                <strong>🚩 Red Flags:</strong>
                <span style="color: ${color}; font-weight: 600;">
                  ${count} issues
                </span><br>
                ${flagData.summary}
              </div>`,
            );
            setMessages((prev) => [...prev, flagMsg]);
          }
        }
      }
    } catch (e) {
      console.error(`Red flag error for ${ticker}`);
    }

    // ④ Earnings
    try {
      const earnResp = await fetch(`${API_BASE_URL}/api/rag-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${ticker} latest quarter summary`,
          language: "en",
        }),
      });

      if (earnResp.ok) {
        const earnData = await earnResp.json();

        if (earnData.response && earnData.totalSources > 0) {
          const sumResp = await fetch(
            `${LOCAL_API_BASE_URL}/api/summarize-earnings`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ticker,
                earningsContent: earnData.response,
              }),
            },
          );

          if (sumResp.ok) {
            const sumData = await sumResp.json();
            const sentiment = sumData.sentiment || "neutral";
            const color = sentiment === "positive" ? "#10b981" : "#6b7280";

            const earnMsg = await createAgentMessage(
              `<div style="padding: 10px; background: #f9fafb; border-radius: 6px;">
                <strong>📞 Earnings:</strong>
                <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">
                  ${sentiment}
                </span><br>
                ${sumData.summary}<br>
                ${
                  sumData.issues?.length > 0
                    ? `<span style="color: #ef4444;">Issues: ${sumData.issues.join(", ")}</span>`
                    : "✅ No issues"
                }
              </div>`,
            );
            setMessages((prev) => [...prev, earnMsg]);
          }
        }
      }
    } catch (e) {
      console.error(`Earnings error for ${ticker}`);
    }
  };
  // ✅ 新函数：并行分析单只股票
  const analyzeSingleStockParallel = async (ticker: string) => {
    // 显示开始标记
    const headerMsg = await createAgentMessage(
      `<div style="border-top: 3px solid #667eea; padding-top: 16px; margin-top: 20px;">
        <strong>📊 ${ticker} Analysis</strong>
      </div>`,
    );
    setMessages((prev) => [...prev, headerMsg]);

    // ✅ 并行执行 3 个分析任务
    const [valuationResult, redFlagsResult, earningsResult] =
      await Promise.allSettled([
        // 任务 1: 估值
        fetchValuationData(ticker),
        // 任务 2: Red Flags
        fetchRedFlagsData(ticker),
        // 任务 3: 财报
        fetchEarningsData(ticker),
      ]);

    // 按顺序显示结果
    if (valuationResult.status === "fulfilled" && valuationResult.value) {
      const msg = await createAgentMessage(valuationResult.value);
      setMessages((prev) => [...prev, msg]);
    }

    if (redFlagsResult.status === "fulfilled" && redFlagsResult.value) {
      const msg = await createAgentMessage(redFlagsResult.value);
      setMessages((prev) => [...prev, msg]);
    }

    if (earningsResult.status === "fulfilled" && earningsResult.value) {
      const msg = await createAgentMessage(earningsResult.value);
      setMessages((prev) => [...prev, msg]);
    }
  };
  // ✅ 辅助函数 1: 获取估值数据
  async function fetchValuationData(ticker: string): Promise<string | null> {
    try {
      const response = await fetch(
        `${LOCAL_API_BASE_URL}/api/valuation-analysis`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker,
            query: `Valuation analysis for ${ticker}`,
          }),
        },
      );
      if (!response.ok) return null;

      const vData = await response.json();

      // --- sanitize numbers ---
      const currentPrice = Number(vData.data?.current_price) || 0;
      const targetPrice = Number(vData.data?.target_price) || 0;

      // may be "12.3" or "12.3%"
      const rawPct = vData.data?.upside_percentage ?? "0";
      const pctApi =
        typeof rawPct === "string"
          ? parseFloat(rawPct.replace("%", "").trim())
          : Number(rawPct);

      // prefer price-derived % to keep sign consistent
      const pctFromPrices =
        currentPrice > 0
          ? ((targetPrice - currentPrice) / currentPrice) * 100
          : NaN;
      const pct = Number.isFinite(pctFromPrices)
        ? pctFromPrices
        : Number.isFinite(pctApi)
          ? pctApi
          : 0;

      const EPS = 1e-6;
      const isDownside = pct < -EPS;
      const isUpside = pct > 5; // keep your +5% threshold for "UNDERVALUED"

      // 👇 now supports OVERVALUED when downside
      const status = isDownside
        ? "OVERVALUED"
        : isUpside
          ? "UNDERVALUED"
          : "FAIR";
      const color = isDownside ? "#ef4444" : isUpside ? "#10b981" : "#f59e0b"; // red | green | amber
      const icon = isDownside ? "⚠️" : isUpside ? "✅" : "⚠️";

      const direction = isDownside ? "downside" : "upside";
      const pctDisplay = Math.abs(pct) < EPS ? 0 : pct; // avoid -0.0

      return `<div style="padding: 10px; background: #f9fafb; border-radius: 6px;">
        <strong>💰 Valuation:</strong>
        <span style="color:${color}; font-weight:600;">
          ${icon} ${status}
        </span><br>
        $${currentPrice.toFixed(2)} → $${targetPrice.toFixed(2)} (${pctDisplay.toFixed(1)}% ${direction})
      </div>`;
    } catch (e) {
      console.error("fetchValuationData error:", e);
      return null;
    }
  }

  // ✅ 辅助函数 2: 获取 Red Flags 数据
  async function fetchRedFlagsData(ticker: string): Promise<string | null> {
    try {
      const newsResp = await fetch(`${API_BASE_URL}/api/search-news`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${ticker} red flag risks issues`,
          language: "en",
        }),
      });

      if (!newsResp.ok) return null;

      const newsData = await newsResp.json();

      if (newsData.newsContent?.length > 50) {
        const flagResp = await fetch(
          `${LOCAL_API_BASE_URL}/api/analyze-redflags`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker,
              newsContent: newsData.newsContent,
            }),
          },
        );

        if (flagResp.ok) {
          const flagData = await flagResp.json();
          const count = flagData.redflag_count || 0;
          const color = count === 0 ? "#10b981" : "#f59e0b";

          return `<div style="padding: 10px; background: #f9fafb; border-radius: 6px;">
            <strong>🚩 Red Flags:</strong>
            <span style="color: ${color}; font-weight: 600;">
              ${count} issues
            </span><br>
            ${flagData.summary}
          </div>`;
        }
      }
      return null;
    } catch (error) {
      console.error(`Red flags error for ${ticker}:`, error);
      return null;
    }
  }

  // ✅ 辅助函数 3: 获取财报数据
  async function fetchEarningsData(ticker: string): Promise<string | null> {
    try {
      const earnResp = await fetch(`${API_BASE_URL}/api/rag-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${ticker} latest quarter summary`,
          language: "en",
        }),
      });

      if (!earnResp.ok) return null;

      const earnData = await earnResp.json();

      if (earnData.response && earnData.totalSources > 0) {
        const sumResp = await fetch(
          `${LOCAL_API_BASE_URL}/api/summarize-earnings`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ticker,
              earningsContent: earnData.response,
            }),
          },
        );

        if (sumResp.ok) {
          const sumData = await sumResp.json();
          const sentiment = sumData.sentiment || "neutral";
          const color = sentiment === "positive" ? "#10b981" : "#6b7280";

          return `<div style="padding: 10px; background: #f9fafb; border-radius: 6px;">
            <strong>📞 Earnings:</strong>
            <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">
              ${sentiment}
            </span><br>
            ${sumData.summary}<br>
            ${
              sumData.issues?.length > 0
                ? `<span style="color: #ef4444;">Issues: ${sumData.issues.join(", ")}</span>`
                : "✅ No issues"
            }
          </div>`;
        }
      }
      return null;
    } catch (error) {
      console.error(`Earnings error for ${ticker}:`, error);
      return null;
    }
  }

  // Navigation function for routing to specialist modules
  const navigateToSpecialistModule = (
    routeType: string,
    originalQuery: string,
  ) => {
    if (routeType === "PERFORMANCE") {
      // 新增：调用性能分析 API
      handlePerformanceAnalysis(originalQuery);
    } else if (routeType === "EARNINGS") {
      // 财报 API
      handleEarningsAnalysis(originalQuery, null);
    } else {
      // NEWS 类型调用内部 API
      handleNewsAnalysis(originalQuery);
    }

    return true;
  };

  // 添加新的财报分析函数
  const handleEarningsAnalysis = async (
    query: string,
    aiTicker?: string | null,
  ) => {
    try {
      // ============================================
      // STEP 1: 显示加载状态
      // ============================================
      const loadingMsg = await createAgentMessage(
        `<strong>🎯 Earnings Call Specialist</strong><br>Analyzing your query...`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      // ============================================
      // STEP 2: 解析查询参数
      // ============================================

      // 使用 AI 识别的 ticker，或从 query 提取
      let ticker = aiTicker || "AAPL";
      if (!aiTicker) {
        const tickerMatch = query.toUpperCase().match(/\b([A-Z]{2,5})\b/);
        if (tickerMatch) ticker = tickerMatch[1];
      }

      // 提取 topic
      let topic: "transcript" | "summary" | "qa" = "summary";
      if (/transcript|full|完整|电话会议记录/i.test(query)) {
        topic = "transcript";
      } else if (/q&a|qa|问答|分析师/i.test(query)) {
        topic = "qa";
      }

      // 检查用户是否指定了时间
      const quarterMatch = query.match(/Q(\d)/i) || query.match(/第(\d)季度/);
      const yearMatch = query.match(/20(\d{2})/);

      let quarter: number;
      let year: number;

      if (quarterMatch && yearMatch) {
        // 用户指定了时间
        quarter = parseInt(quarterMatch[1]);
        year = parseInt("20" + yearMatch[1]);
      } else {
        // 用户没指定时间，获取最新财报时间
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/earnings/latest-transcript/${ticker}`,
          );
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              quarter = parseInt(data.quarter);
              year = parseInt(data.year);
            } else {
              quarter = 3;
              year = 2025;
            }
          } else {
            quarter = 3;
            year = 2025;
          }
        } catch (error) {
          console.error("Failed to get latest earnings:", error);
          quarter = 3;
          year = 2025;
        }
      }

      console.log("📊 Parsed params:", { ticker, topic, quarter, year });

      // 检测语言
      const lang = /[\u4e00-\u9fa5]/.test(query) ? "zh" : "en";

      // ============================================
      // STEP 3: 根据 topic 调用不同的 API
      // ============================================
      let content = "";

      if (topic === "transcript") {
        content = await fetchAndFormatTranscript(ticker, quarter, year);
      } else if (topic === "summary") {
        content = await fetchAndFormatSummary(ticker, quarter, year, lang);
      } else if (topic === "qa") {
        content = await fetchAndFormatQA(ticker, quarter, year, lang);
      } else {
        content = await fetchAndFormatSummary(ticker, quarter, year, lang);
      }

      // ============================================
      // STEP 4: 显示结果
      // ============================================
      const resultsMsg = await createAgentMessage(content, ["earnings"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error: any) {
      console.error("Earnings analysis error:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>${error.message || "Failed to fetch earnings data"}`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // 辅助函数：解析用户查询
  // ============================================
  async function parseEarningsQuery(query: string): Promise<{
    ticker: string;
    topic: "transcript" | "summary" | "qa";
    quarter: number;
    year: number;
  }> {
    // Step 1: 提取 ticker
    const tickerMatch = query.toUpperCase().match(/\b([A-Z]{2,5})\b/);
    const ticker = tickerMatch ? tickerMatch[1] : "AAPL";

    // Step 2: 提取 topic
    let topic: "transcript" | "summary" | "qa" = "summary";
    if (/transcript|full|完整|电话会议记录/i.test(query)) {
      topic = "transcript";
    } else if (/q&a|qa|问答|分析师/i.test(query)) {
      topic = "qa";
    }

    // Step 3: 提取用户指定的时间
    const quarterMatch = query.match(/Q(\d)/i) || query.match(/第(\d)季度/);
    const yearMatch = query.match(/20(\d{2})/);

    const userQuarter = quarterMatch ? parseInt(quarterMatch[1]) : null;
    const userYear = yearMatch ? parseInt("20" + yearMatch[1]) : null;

    // Step 4: 获取该公司最新可用的财报时间
    let latestQuarter: number | null = null;
    let latestYear: number | null = null;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/earnings/latest-transcript/${ticker}`,
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          latestQuarter = parseInt(data.quarter);
          latestYear = parseInt(data.year);
        }
      }
    } catch (error) {
      console.error("Failed to fetch latest transcript:", error);
    }

    // Step 5: 决定使用哪个时间
    let finalQuarter: number;
    let finalYear: number;

    if (userQuarter && userYear) {
      // 用户指定了完整时间，检查是否有效
      const isValidTime = await checkEarningsExists(
        ticker,
        userQuarter,
        userYear,
      );

      if (isValidTime) {
        finalQuarter = userQuarter;
        finalYear = userYear;
      } else {
        // 用户指定的时间不存在，用最新的
        console.warn(
          `⚠️ ${ticker} Q${userQuarter} ${userYear} not found, using latest`,
        );
        finalQuarter = latestQuarter || 3;
        finalYear = latestYear || new Date().getFullYear();
      }
    } else {
      // 用户没指定时间，用最新的
      finalQuarter = latestQuarter || 3;
      finalYear = latestYear || new Date().getFullYear();
    }

    return { ticker, topic, quarter: finalQuarter, year: finalYear };
  }

  // 检查财报是否存在
  async function checkEarningsExists(
    ticker: string,
    quarter: number,
    year: number,
  ): Promise<boolean> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/earnings/ai-doc?ticker=${ticker}&year=${year}&quarter=Q${quarter}&docType=summary&lang=en`,
      );

      if (response.ok) {
        const data = await response.json();
        return data.success === true;
      }
    } catch (error) {
      console.error("Check earnings exists error:", error);
    }
    return false;
  }

  // 本地正则解析（fallback）
  function parseQueryLocally(
    query: string,
    defaultQuarter: number,
    defaultYear: number,
  ): {
    ticker: string;
    topic: "transcript" | "summary" | "qa";
    quarter: number;
    year: number;
  } {
    // 提取 Ticker（2-5个大写字母）
    const tickerMatch = query.toUpperCase().match(/\b([A-Z]{2,5})\b/);
    const ticker = tickerMatch ? tickerMatch[1] : "AAPL";

    // 提取 Topic
    let topic: "transcript" | "summary" | "qa" = "summary";
    if (/transcript|full|完整|电话会议记录/i.test(query)) {
      topic = "transcript";
    } else if (/q&a|qa|问答|分析师/i.test(query)) {
      topic = "qa";
    } else if (/summary|摘要|总结|概要/i.test(query)) {
      topic = "summary";
    }

    // 提取 Quarter
    const quarterMatch = query.match(/Q(\d)/i) || query.match(/第(\d)季度/);
    const quarter = quarterMatch ? parseInt(quarterMatch[1]) : defaultQuarter;

    // 提取 Year
    const yearMatch = query.match(/20(\d{2})/);
    const year = yearMatch ? parseInt("20" + yearMatch[1]) : defaultYear;

    return { ticker, topic, quarter, year };
  }

  // ============================================
  // 1. Full Transcript - 完整显示
  // ============================================
  async function fetchAndFormatTranscript(
    ticker: string,
    quarter: number,
    year: number,
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/api/ninjas/transcript?ticker=${ticker}&year=${year}&quarter=Q${quarter}`,
    );

    if (!response.ok) {
      throw new Error(`Transcript not found for ${ticker} Q${quarter} ${year}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch transcript");
    }

    let html = `<div style="font-family: system-ui, sans-serif;">`;

    // Header
    html += `<div style="margin-bottom: 16px;">
      <h2 style="font-size: 24px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">
        ${data.metadata?.companyName || ticker} (${ticker})
      </h2>
      <p style="font-size: 14px; color: #64748b;">
        ${year} Q${quarter} Earnings Call · ${data.metadata?.earningsTimingDisplay || "During Market"} · ${data.metadata?.callDate || "Date TBD"}
      </p>
    </div>`;

    // Participants
    if (data.participants && data.participants.length > 0) {
      html += `<details style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
        <summary style="cursor: pointer; padding: 12px 16px; font-weight: 500; color: #334155;">
          Participants (${data.participants.length})
        </summary>
        <div style="padding: 12px 16px; border-top: 1px solid #f1f5f9;">
          <ul style="margin: 0; padding-left: 16px; list-style: none;">`;

      data.participants.forEach((p: any) => {
        html += `<li style="padding: 4px 0; font-size: 14px;">
          <span style="color: #2563eb;">${p.name || "Unknown"}</span>
          ${p.role ? `<span style="color: #64748b;"> — ${p.role}${p.company ? `, ${p.company}` : ""}</span>` : ""}
        </li>`;
      });

      html += `</ul></div></details>`;
    }

    // Transcript Segments - 完整显示
    if (data.transcriptSplit && data.transcriptSplit.length > 0) {
      html += `<div style="display: flex; flex-direction: column; gap: 16px;">`;

      data.transcriptSplit.forEach((segment: any) => {
        const role = (segment.role || "").toLowerCase();
        const isAnalyst = /analyst|research|bank|capital|securities/.test(role);
        const isManagement =
          /ceo|cfo|coo|cto|chief|president|vp|ir|operator|management|executive/.test(
            role,
          );

        const alignment = isAnalyst ? "flex-end" : "flex-start";
        const bgColor = isAnalyst
          ? "#eff6ff"
          : isManagement
            ? "#ecfdf5"
            : "#f8fafc";
        const textColor = isAnalyst
          ? "#1e40af"
          : isManagement
            ? "#065f46"
            : "#1e293b";

        html += `<div style="display: flex; flex-direction: column; align-items: ${alignment}; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b;">
            ${segment.role ? `<span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px;">${segment.role}</span>` : ""}
            <span style="font-weight: 500; color: #334155;">${segment.speaker || segment.company || "Unknown"}</span>
          </div>
          <div style="max-width: 90%; background: ${bgColor}; color: ${textColor}; padding: 16px; border-radius: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
            <p style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${segment.text || ""}</p>
          </div>
        </div>`;
      });

      html += `</div>`;
    }

    // Full Transcript
    if (data.transcript) {
      html += `<details style="margin-top: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff;">
        <summary style="cursor: pointer; padding: 12px 16px; font-weight: 500; color: #334155;">
          Full Transcript
        </summary>
        <div style="padding: 16px; border-top: 1px solid #f1f5f9; max-height: 600px; overflow-y: auto;">
          <pre style="margin: 0; font-size: 14px; line-height: 1.6; white-space: pre-wrap; color: #1e293b; background: #f8fafc; padding: 16px; border-radius: 8px;">${data.transcript}</pre>
        </div>
      </details>`;
    }

    html += `</div>`;
    return html;
  }

  // ============================================
  // 2. Summary - 纯 HTML 折叠样式
  // ============================================
  async function fetchAndFormatSummary(
    ticker: string,
    quarter: number,
    year: number,
    lang: string = "en",
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/api/earnings/ai-doc?ticker=${ticker}&year=${year}&quarter=Q${quarter}&docType=summary&lang=${lang}`,
    );

    if (!response.ok) {
      throw new Error(`Summary not found for ${ticker} Q${quarter} ${year}`);
    }

    const result = await response.json();

    if (!result.success) {
      // 检查是否是"正在生成"的提示
      if (
        result.error?.includes("started generating") ||
        result.error?.includes("check again") ||
        result.error?.includes("请稍后")
      ) {
        return `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px;">
          <strong style="color: #b45309;">⏳ ${lang === "zh" ? "文档生成中" : "Document Being Generated"}</strong>
          <p style="margin-top: 8px; color: #92400e;">${result.error}</p>
        </div>`;
      }
      throw new Error(result.error || "Failed to fetch summary");
    }

    const data = result.data;
    const sections = data.sections || [];

    let html = `
  <div style="font-family: system-ui, -apple-system, sans-serif; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #fff;">
    <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb; background: #f9fafb;">
      <div style="font-size: 18px; font-weight: 600; color: #1f2937;">
        ${lang === "zh" ? "财报摘要" : "Earnings Summary"}
        <span style="font-size: 14px; font-weight: 400; color: #6b7280; margin-left: 8px;">
          ${ticker} - ${year} Q${quarter}
        </span>
      </div>
    </div>
    <div style="padding: 12px;">
      ${sections
        .map((section: any, idx: number) => {
          const isRedFlag = /red flag|风险提示/i.test(section.heading);
          const summaryBg = isRedFlag ? "#fef2f2" : "#f3f4f6";
          const summaryColor = isRedFlag ? "#dc2626" : "#374151";
          const summaryBorder = isRedFlag ? "#fecaca" : "#e5e7eb";
          const contentBg = isRedFlag ? "#fef2f2" : "#ffffff";
          const contentBorder = isRedFlag ? "#fecaca" : "#e5e7eb";
          const bulletColor = isRedFlag ? "#dc2626" : "#2563eb";
          const textColor = isRedFlag ? "#991b1b" : "#374151";
          const textWeight = isRedFlag ? "500" : "400";

          return `
      <details ${idx === 0 ? "open" : ""} style="margin-bottom: 8px;">
        <summary style="cursor: pointer; padding: 12px 16px; border-radius: 8px; font-weight: 600; font-size: 14px; background: ${summaryBg}; color: ${summaryColor}; border: 1px solid ${summaryBorder}; list-style: none;">
          ${section.heading}
        </summary>
        <div style="padding: 16px; margin-top: 4px; border-radius: 8px; background: ${contentBg}; border: 1px solid ${contentBorder};">
          ${(section.bullets || [])
            .map(
              (bullet: string) => `
          <div style="display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; line-height: 1.6; font-size: 14px; color: ${textColor}; font-weight: ${textWeight};">
            <span style="color: ${bulletColor}; flex-shrink: 0; margin-top: 2px;">•</span>
            <span style="flex: 1;">${bullet}</span>
          </div>
          `,
            )
            .join("")}
        </div>
      </details>`;
        })
        .join("")}
    </div>
  </div>`;

    return html;
  }

  // ============================================
  // 3. Q&A - 纯 HTML 折叠样式
  // ============================================
  async function fetchAndFormatQA(
    ticker: string,
    quarter: number,
    year: number,
    lang: string = "en",
  ): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/api/earnings/ai-doc?ticker=${ticker}&year=${year}&quarter=Q${quarter}&docType=qa&lang=${lang}`,
    );

    if (!response.ok) {
      throw new Error(`Q&A not found for ${ticker} Q${quarter} ${year}`);
    }

    const result = await response.json();

    if (!result.success) {
      // 检查是否是"正在生成"的提示
      if (
        result.error?.includes("started generating") ||
        result.error?.includes("check again") ||
        result.error?.includes("请稍后")
      ) {
        return `
        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px;">
          <strong style="color: #b45309;">⏳ ${lang === "zh" ? "文档生成中" : "Document Being Generated"}</strong>
          <p style="margin-top: 8px; color: #92400e;">${result.error}</p>
        </div>`;
      }
      throw new Error(result.error || "Failed to fetch Q&A");
    }

    const data = result.data;

    let html = `<div style="font-family: system-ui, sans-serif;">`;

    // Overall Conclusion
    if (data.conclusion) {
      html += `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 20px;">
        <details open>
          <summary style="cursor: pointer; padding: 16px; font-weight: 600; color: #1e40af; font-size: 18px; list-style: none;">
            ${lang === "zh" ? "总体结论" : "Overall Conclusion"}
          </summary>
          <div style="padding: 0 16px 16px 16px;">
            <p style="color: #374151; line-height: 1.6;">${data.conclusion}</p>
          </div>
        </details>
      </div>`;
    }

    // Q&A Items
    if (data.items && Array.isArray(data.items)) {
      html += `<div style="border: 1px solid #e5e7eb; border-radius: 8px;">
        <details open>
          <summary style="cursor: pointer; padding: 16px; font-weight: 600; color: #1f2937; list-style: none;">
            ${lang === "zh" ? "问答环节" : "Q&A Session"}
            <span style="font-size: 14px; font-weight: 400; color: #6b7280; margin-left: 8px;">
              ${ticker} - ${year} Q${quarter}
            </span>
            <span style="font-size: 14px; font-weight: 400; color: #9ca3af; margin-left: 8px;">
              (${data.items.length} ${lang === "zh" ? "个问题" : "questions"})
            </span>
          </summary>
          <div style="padding: 16px; display: flex; flex-direction: column; gap: 16px;">`;

      data.items.slice(0, 10).forEach((item: any, idx: number) => {
        const sentiment = item.sentiment || 5;
        let sentimentBg, sentimentColor;
        if (sentiment >= 7) {
          sentimentBg = "#dcfce7";
          sentimentColor = "#166534";
        } else if (sentiment >= 6) {
          sentimentBg = "#dbeafe";
          sentimentColor = "#1e40af";
        } else {
          sentimentBg = "#fef9c3";
          sentimentColor = "#854d0e";
        }

        html += `<div style="border-left: 4px solid #3b82f6; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span style="background: #f3f4f6; border: 1px solid #e5e7eb; padding: 2px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">#${item.index || idx + 1}</span>
            <span style="background: #f3f4f6; padding: 2px 10px; border-radius: 4px; font-size: 12px;">${item.analyst || "Unknown Analyst"}</span>
            <span style="background: #f3f4f6; padding: 2px 10px; border-radius: 4px; font-size: 12px;">${item.firm || "Unknown Firm"}</span>
            <span style="background: ${sentimentBg}; color: ${sentimentColor}; padding: 2px 10px; border-radius: 4px; font-size: 12px;">${lang === "zh" ? "情感" : "Sentiment"}: ${sentiment}</span>
          </div>
          <div style="margin-bottom: 12px;">
            <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 4px;">${lang === "zh" ? "问题" : "Question"}:</h4>
            <p style="color: #1f2937; font-weight: 500; line-height: 1.5; margin: 0;">${item.question}</p>
          </div>
          <details>
            <summary style="cursor: pointer; font-size: 14px; font-weight: 600; color: #374151;">${lang === "zh" ? "回答" : "Response"}:</summary>
            <p style="margin-top: 8px; color: #374151; line-height: 1.6;">${item.response}</p>
          </details>
        </div>`;
      });

      if (data.items.length > 10) {
        html += `<p style="text-align: center; color: #6b7280; font-size: 14px;">Showing 10 of ${data.items.length} questions</p>`;
      }

      html += `</div></details></div>`;
    }

    html += `</div>`;
    return html;
  }

  const handleTwitterAnalysis = async (
    query: string,
    ticker?: string | null,
  ) => {
    try {
      const loadingMsg = await createAgentMessage(
        `<strong>🐦 Search on X Results</strong><br>Searching Twitter/X for relevant discussions...<br><br><em>⏱️ Analyzing social sentiment and discussions</em>`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      // ✅ 使用完整的用户问题，而不只是 ticker
      const searchQuery = query; // 使用完整问题
      console.log("🐦 Searching Twitter for full query:", searchQuery);

      // ✅  ��一0;�：调用 twitter-search - 使用完整问题
      const searchResponse = await fetch(
        `https://smartnews.checkitanalytics.com/api/twitter-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchQuery, // 完整的用户问题
            count: 10,
          }),
        },
      );

      if (!searchResponse.ok) {
        throw new Error(`Twitter search failed: ${searchResponse.status}`);
      }

      const searchData = await searchResponse.json();
      console.log("Twitter search results:", searchData);

      // ✅ 第二步：调用 twitter-consolidate - 同样使用完整问题
      const response = await fetch(
        `https://smartnews.checkitanalytics.com/api/twitter-consolidate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            twitterResults:
              searchData.results || searchData.tweets || searchData,
            query: searchQuery, // 完整问题
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Consolidation failed: ${response.status}`);
      }

      const twitterData = await response.json();
      console.log("Twitter consolidation result:", twitterData);

      // ✅ 格式化输出 - 更紧凑，显示完整查询
      let content = `
      <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

        <!-- 标题栏 - 更紧凑 -->
        <div style="background: linear-gradient(135deg, #1DA1F2 0%, #14171A 100%); padding: 10px 14px; color: white;">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 6px; font-size: 14px;">
            🐦 Twitter/X Analysis ${ticker ? `- ${ticker}` : ""}
            <span style="margin-left: auto; font-size: 11px; opacity: 0.9;">
              ${new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </h3>
        </div>

        <!-- 统计信息 - 显示完整查询 -->
        <div style="padding: 8px 14px; background: #f7f9fa; border-bottom: 1px solid #e1e8ed;">
          <div style="color: #536471; font-size: 12px;">
            <div><strong>Query:</strong> "${searchQuery.length > 100 ? searchQuery.substring(0, 100) + "..." : searchQuery}"</div>
            <div><strong>Analyzed:</strong> ${twitterData.totalTweets || 10} tweets${ticker ? ` for ${ticker}` : ""}</div>
          </div>
        </div>

        <!-- Key Insights - 更紧凑 -->
        <div style="padding: 12px 14px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
            <span style="font-size: 14px;">✨</span>
            <h4 style="color: #14171a; margin: 0; font-size: 13px; font-weight: 600;">Key Market Insights</h4>
          </div>

          <div style="background: #15202b; color: #ffffff; padding: 12px; border-radius: 6px;">`;

      // ✅ 格式化 bullet points - 更紧凑
      if (twitterData.summary) {
        const bulletPoints = twitterData.summary
          .split("•")
          .filter((point: string) => point.trim());

        bulletPoints.forEach((point: string, index: number) => {
          if (point.trim()) {
            // 高亮数字和股票代码
            let formattedPoint = point
              .trim()
              .replace(
                /\$[A-Z]+/g,
                '<span style="color: #1DA1F2; font-weight: bold;">$&</span>',
              ) // 股票代码
              .replace(
                /[\+\-]?\d+(\.\d+)?%/g,
                '<span style="color: #10b981; font-weight: bold;">$&</span>',
              ) // 百分比
              .replace(/(SPX|YTD)/g, '<span style="color: #f59e0b;">$&</span>'); // 指数缩写

            content += `
              <div style="display: flex; align-items: flex-start; margin-bottom: ${index === bulletPoints.length - 1 ? "0" : "10px"};">
                <span style="color: #1DA1F2; margin-right: 8px; font-size: 14px; flex-shrink: 0;">•</span>
                <div style="line-height: 1.4; font-size: 13px;">
                  ${formattedPoint}
                </div>
              </div>`;
          }
        });
      } else {
        // 如果没有 summary，显示提示
        content += `
          <div style="color: #9ca3af; font-size: 13px; text-align: center;">
            No insights available for this query.
          </div>`;
      }

      content += `
          </div>
        </div>
      </div>`;

      // ✅ 添加 modules 参数，让用户可以深入探索
      const resultsMsg = await createAgentMessage(content, ["news"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling Twitter API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to fetch Twitter/X discussions. ${error instanceof Error ? error.message : "Unknown error"}<br><br><em>Tip: Try searching for specific topics or tickers like "TSLA robotaxi" or "Apple AI strategy"</em>`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ 估值分析处理函数
  const handleValuationAnalysis = async (
    query: string,
    ticker: string,
    companyName?: string | null,
  ) => {
    try {
      const loadingMsg = await createAgentMessage(
        `<strong>🎯 Valuation Analysis</strong><br>Running comprehensive analysis for <strong>${companyName || ticker}</strong>...<br><br><em>⏱️ This takes 10-15 seconds (DCF + Relative Valuation + AI)</em>`,
      );
      setMessages((prev) => [...prev, loadingMsg]);

      console.log("💰 Calling valuation API for:", ticker);

      const response = await fetch(
        `${LOCAL_API_BASE_URL}/api/valuation-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticker: ticker,
            query: query,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const valuationData = await response.json();

      // 获取各种价格数据
      const dcfPrice =
        valuationData.valuations?.dcf?.intrinsic_value ||
        valuationData.details?.dcf_valuation?.intrinsic_value ||
        0;
      const relativePrice =
        valuationData.valuations?.relative?.median_estimate ||
        valuationData.details?.relative_valuation?.median_estimate ||
        0;
      const currentPrice = valuationData.current_price || 0;
      const targetPrice =
        valuationData.target_price ||
        valuationData.ai_recommendation?.chosen_price ||
        0;

      const dcfUpside =
        currentPrice > 0 ? ((dcfPrice - currentPrice) / currentPrice) * 100 : 0;
      const relativeUpside =
        currentPrice > 0
          ? ((relativePrice - currentPrice) / currentPrice) * 100
          : 0;
      const finalUpside =
        currentPrice > 0
          ? ((targetPrice - currentPrice) / currentPrice) * 100
          : 0;

      const confidence =
        (valuationData.ai_recommendation?.confidence ||
          valuationData.confidence ||
          0.7) * 100;
      const method =
        valuationData.ai_recommendation?.chosen_method ||
        valuationData.method ||
        "Unknown";

      // 🎯 检测是否为移动设备
      const isMobile = window.innerWidth <= 768;

      // 根据设备类型选择不同的内容
      const content = isMobile
        ? // 📱 移动端版本 - 超紧凑设计
          `
        <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden;">

          <!-- 简化的标题 -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 10px 12px; color: white;">
            <div style="font-size: 14px; font-weight: 600;">
              💰 ${valuationData.ticker} Valuation
            </div>
          </div>

          <!-- 核心数据 - 极简卡片式 -->
          <div style="padding: 12px;">

            <!-- 当前价格 vs AI目标价格 - 融合显示 -->
            <div style="background: #f3f4f6; border-radius: 6px; padding: 10px; margin-bottom: 10px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="color: #6b7280; font-size: 11px;">Current</div>
                  <div style="font-size: 18px; font-weight: bold; color: #1f2937;">$${currentPrice.toFixed(2)}</div>
                </div>
                <div style="text-align: center; padding: 0 10px;">
                  <div style="font-size: 20px; color: ${finalUpside > 0 ? "#10b981" : "#ef4444"};">
                    ${finalUpside > 0 ? "→" : "←"}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="color: #6b7280; font-size: 11px;">Target</div>
                  <div style="font-size: 18px; font-weight: bold; color: ${finalUpside > 0 ? "#10b981" : "#ef4444"};">
                    $${targetPrice.toFixed(2)}
                  </div>
                </div>
              </div>

              <!-- 涨跌幅 + AI选择信息 -->
              <div style="text-align: center; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 16px; font-weight: 600; color: ${finalUpside > 0 ? "#10b981" : "#ef4444"};">
                  ${finalUpside > 0 ? "+" : ""}${finalUpside.toFixed(1)}% ${finalUpside > 0 ? "Upside" : "Downside"}
                </div>
                <div style="font-size: 10px; color: #6b7280; margin-top: 2px;">
                  AI picked: ${method === "RelativeMedian" ? "Relative" : "DCF"} • ${confidence.toFixed(0)}% confidence
                </div>
              </div>
            </div>

            <!-- 两个估值模型对比 -->
            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
              <!-- DCF -->
              <div style="flex: 1; background: #eff6ff; border-radius: 6px; padding: 8px; border-left: 3px solid #3b82f6;">
                <div style="font-size: 10px; color: #6b7280;">DCF</div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">$${dcfPrice.toFixed(0)}</div>
                <div style="font-size: 11px; color: ${dcfUpside > 0 ? "#10b981" : "#ef4444"};">
                  ${dcfUpside > 0 ? "+" : ""}${dcfUpside.toFixed(0)}%
                </div>
              </div>

              <!-- Relative -->
              <div style="flex: 1; background: #faf5ff; border-radius: 6px; padding: 8px; border-left: 3px solid #8b5cf6;">
                <div style="font-size: 10px; color: #6b7280;">Relative</div>
                <div style="font-size: 14px; font-weight: 600; color: #1f2937;">$${relativePrice.toFixed(0)}</div>
                <div style="font-size: 11px; color: ${relativeUpside > 0 ? "#10b981" : "#ef4444"};">
                  ${relativeUpside > 0 ? "+" : ""}${relativeUpside.toFixed(0)}%
                </div>
              </div>
            </div>

            <!-- 简短理由 -->
            ${
              valuationData.ai_recommendation?.rationale ||
              valuationData.rationale
                ? `
            <div style="background: #f9fafb; border-radius: 6px; padding: 8px; border-left: 3px solid #6b7280;">
              <div style="font-size: 11px; color: #4b5563; line-height: 1.4;">
                ${(valuationData.ai_recommendation?.rationale || valuationData.rationale).substring(0, 100)}...
              </div>
            </div>`
                : ""
            }
          </div>
        </div>`
        : // 💻 桌面端版本 - 保持原有的美观设计
          `
      <div style="background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">

        <!-- 顶部标题栏 -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 16px 20px; color: white;">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
            💰 Valuation Summary for ${valuationData.ticker}
          </h3>
        </div>

        <!-- 模型估值对比 -->
        <div style="padding: 20px; border-bottom: 1px solid #e5e7eb;">
          <h4 style="color: #374151; margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">Model Estimates Comparison</h4>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">

            <!-- DCF Model -->
            <div style="border-left: 4px solid #3b82f6; padding-left: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 14px;">📊</span>
                <span style="color: #6b7280; font-size: 13px;">DCF Model</span>
              </div>
              <div style="font-size: 28px; font-weight: bold; color: #1f2937;">$${dcfPrice.toFixed(2)}</div>
              <div style="font-size: 12px; color: ${dcfUpside > 0 ? "#10b981" : "#ef4444"}; margin-top: 2px;">
                ${dcfUpside > 0 ? "+" : ""}${dcfUpside.toFixed(1)}% ${dcfUpside > 0 ? "↑" : "↓"}
              </div>
            </div>

            <!-- Relative Model -->
            <div style="border-left: 4px solid #8b5cf6; padding-left: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 14px;">📈</span>
                <span style="color: #6b7280; font-size: 13px;">Relative Model</span>
              </div>
              <div style="font-size: 28px; font-weight: bold; color: #1f2937;">$${relativePrice.toFixed(2)}</div>
              <div style="font-size: 12px; color: ${relativeUpside > 0 ? "#10b981" : "#ef4444"}; margin-top: 2px;">
                ${relativeUpside > 0 ? "+" : ""}${relativeUpside.toFixed(1)}% ${relativeUpside > 0 ? "↑" : "↓"}
              </div>
            </div>

            <!-- Current Price -->
            <div style="border-left: 4px solid #10b981; padding-left: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                <span style="font-size: 14px;">💰</span>
                <span style="color: #6b7280; font-size: 13px;">Current Price</span>
              </div>
              <div style="font-size: 28px; font-weight: bold; color: #1f2937;">$${currentPrice.toFixed(2)}</div>
              <div style="font-size: 12px; color: #6b7280; margin-top: 2px;">Market Price</div>
            </div>

          </div>
        </div>

        <!-- AI 选择的估值 -->
        <div style="padding: 20px;">
          <h4 style="color: #374151; margin: 0 0 16px 0; font-size: 14px; font-weight: 600;">AI-Selected Estimate</h4>

          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 2px solid #f59e0b; border-radius: 8px; padding: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 40%; padding: 8px 0;">
                  <div style="color: #78350f; font-size: 12px; margin-bottom: 4px;">Selected Method</div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">📈</span>
                    <span style="color: #451a03; font-weight: 600; font-size: 16px;">
                      ${method === "RelativeMedian" ? "Relative Valuation (Median)" : method === "DCF" ? "DCF Model" : method}
                    </span>
                  </div>
                </td>

                <td style="width: 30%; text-align: center; padding: 8px 0;">
                  <div style="color: #78350f; font-size: 12px; margin-bottom: 4px;">Target Price</div>
                  <div style="font-size: 32px; font-weight: bold; color: #451a03;">$${targetPrice.toFixed(2)}</div>
                  <div style="font-size: 13px; color: ${finalUpside > 0 ? "#166534" : "#991b1b"}; font-weight: 600;">
                    ${finalUpside > 0 ? "+" : ""}${finalUpside.toFixed(1)}% ${finalUpside > 0 ? "↑" : "↓"}
                  </div>
                </td>

                <td style="width: 30%; text-align: center; padding: 8px 0;">
                  <div style="color: #78350f; font-size: 12px; margin-bottom: 4px;">Confidence</div>
                  <div style="font-size: 32px; font-weight: bold; color: #451a03;">${confidence.toFixed(0)}%</div>
                  <div style="font-size: 13px; color: #78350f;">
                    ${confidence >= 80 ? "High" : confidence >= 60 ? "Medium" : "Low"}
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Rationale -->
          ${
            valuationData.ai_recommendation?.rationale ||
            valuationData.rationale
              ? `
          <div style="margin-top: 16px; padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #6b7280;">
            <div style="color: #374151; font-size: 12px; margin-bottom: 4px; font-weight: 600;">AI Rationale</div>
            <div style="color: #4b5563; font-size: 13px; line-height: 1.5;">
              ${valuationData.ai_recommendation?.rationale || valuationData.rationale}
            </div>
          </div>`
              : ""
          }

        </div>
      </div>`;

      const resultsMsg = await createAgentMessage(content, ["valuation"]);
      setMessages((prev) => [...prev, resultsMsg]);
    } catch (error) {
      console.error("Error calling valuation API:", error);
      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Failed to perform valuation analysis. ${error instanceof Error ? error.message : "Unknown error"}<br><br><em>Tip: Try "Is Tesla undervalued?" or "Should I buy AAPL?"</em>`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserMessage = async (message: string) => {
    setIsLoading(true);

    // ✅ 优先使用 AI 分类
    try {
      console.log("📤 Sending query to AI classifier:", message);

      const apiUrl = `${LOCAL_API_BASE_URL}/api/classify-intent`;
      const classifyResponse = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: message }),
      });

      if (classifyResponse.ok) {
        const classifyData = await classifyResponse.json();
        console.log("📥 AI classification result:", classifyData);

        // 显示分类结果
        const classificationMsg = await createAgentMessage(
          `<strong>🤖 AI Understanding</strong><br>Intent: <strong>${classifyData.intent}</strong>${classifyData.ticker ? ` - ${classifyData.ticker}` : ""}${classifyData.industry ? ` - ${classifyData.industry}` : ""}<br><em>${classifyData.rationale || ""}</em>`,
        );
        setMessages((prev) => [...prev, classificationMsg]);

        const intent = classifyData.intent;
        const ticker = classifyData.ticker;
        const industry = classifyData.industry;

        // ✅ 路由到不同模块
        if (intent === "FDA") {
          // 新增：FDA
          handleFDAAnalysis(
            message,
            classifyData.identifier || null,
            classifyData.identifier_type || null,
          );
          return;
        } else if (intent === "TWITTER") {
          // ✅ 新增: Twitter/社交媒体分析
          handleTwitterAnalysis(message, classifyData.ticker || null);
          return;
        } else if (intent === "SCREENING") {
          // 股票筛选
          if (industry) {
            handleStockScreening(industry);
          } else {
            const agentMessage: Message = {
              id: Date.now() + 1,
              content:
                "<strong>🔍 Industry Selection</strong><br>Please select an industry to focus our analysis:",
              sender: "agent",
              timestamp: new Date(),
              showIndustrySelector: true,
            };
            setMessages((prev) => [...prev, agentMessage]);
            setIsLoading(false);
          }
          return;
        } else if (intent === "PERFORMANCE") {
          handlePerformanceAnalysis(
            message,
            classifyData.ticker || null,
            classifyData.company_name || null,
          );
          return;
        } else if (intent === "EARNINGS") {
          handleEarningsAnalysis(message, classifyData.ticker);
          return;
        } else if (intent === "NEWS") {
          // ✅ 一般新闻搜索 - 使用 search-news-v2
          handleNewsAnalysis(message);
          return;
        } else if (intent === "NEWSBRIEF") {
          // ✅ 新增: 具体事件分析 - 使用 newsbrief API
          handleNewsBriefAnalysis(message, ticker, classifyData.company_name);
          return;
        } else if (intent === "RUMOR") {
          // ✅ 新增: 谣言验证 - 使用 detect-rumor API
          handleRumorCheck(message);
          return;
        } else if (intent === "VALUATION") {
          if (ticker) {
            handleValuationAnalysis(message, ticker, classifyData.company_name);
          } else {
            const guideMessage: Message = {
              id: Date.now() + 1,
              content: `<strong>💡 I Need a Specific Stock</strong><br><br>
                    I can analyze individual stocks for valuation!<br><br>
                    <strong>✅ Try asking:</strong><br>
                    • "Is Tesla undervalued?"<br>
                    • "Should I buy AAPL?"<br><br>
                    <strong>🔍 For screening multiple stocks:</strong><br>
                    Ask "What stock should I invest in Technology?"`,
              sender: "agent",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, guideMessage]);
            setIsLoading(false);
          }
          return;
        } else if (intent === "COMPETITIVE") {
          handleCompetitiveAnalysis(
            message,
            classifyData.ticker,
            classifyData.company_name,
            classifyData.industry,
          );
          return;
        } else if (intent === "GENERAL") {
          handleGeneralQuery(message);
          return;
        }
      }
    } catch (error) {
      console.error("AI classification failed:", error);
    }

    // ✅ AI 失败,降级方案1: 关键词检测股票筛选
    const stockSelectionKeywords = [
      "what stock should i invest",
      "which stock",
      "best stock",
      "undervalued",
      "stock recommendation",
      "invest in",
      "good investment",
      "stock pick",
    ];

    const isStockSelection = stockSelectionKeywords.some((keyword) =>
      message.toLowerCase().includes(keyword),
    );

    if (isStockSelection) {
      console.log("🔄 Fallback: Detected stock screening via keywords");

      // 尝试提取行业
      const industryMatch = message.match(/(?:in|invest in)\s+(\w+)/i);
      const detectedIndustry = industryMatch ? industryMatch[1] : null;

      // 标准化行业名称
      let industry = detectedIndustry;
      if (industry) {
        const industryMap: Record<string, string> = {
          tech: "Technology",
          technology: "Technology",
          healthcare: "Healthcare",
          finance: "Finance",
          ev: "EV",
          ai: "AI",
        };
        industry = industryMap[industry.toLowerCase()] || industry;
      }

      // 显示免责声明
      const disclaimerMessage: Message = {
        id: Date.now(),
        content:
          "<strong>⚠️ Important Disclaimer</strong><br>This analysis is for informational purposes only and should not be considered as financial advice.",
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, disclaimerMessage]);

      if (industry) {
        // 检 ��到行业,直接开始
        setTimeout(() => {
          handleStockScreening(industry);
        }, 1000);
      } else {
        // 显示行业选择器
        setTimeout(() => {
          const agentMessage: Message = {
            id: Date.now() + 1,
            content:
              "<strong>🔍 Industry Selection</strong><br>Please select an industry:",
            sender: "agent",
            timestamp: new Date(),
            showIndustrySelector: true,
          };
          setMessages((prev) => [...prev, agentMessage]);
          setIsLoading(false);
        }, 1000);
      }

      return;
    }

    // ✅ 降级方案2: 使用关键词匹配其他意图
    const detectedIntent = routeEquityResearchIntent(message);
    if (detectedIntent) {
      const wasRouted = navigateToSpecialistModule(detectedIntent, message);
      if (wasRouted) {
        return;
      }
    }

    // ✅ 最终降级: 显示}��助
    setIsLoading(false);
    const helpMsg = await createAgentMessage(
      `<strong>🤔 I'm not sure how to help</strong><br><br>I can assist with:<br>
    • 📰 News: "What's the latest news on Apple?"<br>
    • 💰 Valuation: "Is Tesla undervalued?"<br>
    • 📊 Performance: "How is Microsoft doing?"<br>
    • 📞 Earnings: "Apple earnings summary"<br>
    • 🔍 Screening: "What stock should I invest in Technology?"<br><br>
    Please try rephrasing!`,
    );
    setMessages((prev) => [...prev, helpMsg]);
  };

  const performIntroductionAnalysis = (stocks: StockData[]) => {
    setIsLoading(true);

    const introMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>🎯 Introduction & Key Factors</strong><br>Framing the key factors and decision criteria for this investment analysis...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, introMessage]);

    const timeout = setTimeout(() => {
      const introResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>📑 Analysis Framework Set</strong><br>Key factors identified: Market position, financial health, growth prospects, and valuation metrics. Proceeding with comprehensive analysis.",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, introResults]);
      setIsLoading(false);

      // Continue to news analytics
      const timeout2 = setTimeout(() => {
        setCurrentStep(5);
        performNewsAnalysisWithStocks(stocks);
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performDataAnalysis = () => {
    setIsLoading(true);

    const dataMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>📊 Data Analytics</strong><br>Gathering and processing relevant financial datasets, market data, and performance metrics...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, dataMessage]);

    const timeout = setTimeout(() => {
      const dataResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>📈 Data Processing Complete</strong><br>Financial datasets analyzed. Key metrics and trends identified for comprehensive evaluation.",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, dataResults]);
      setIsLoading(false);

      // Continue to earnings analysis
      const timeout2 = setTimeout(() => {
        setCurrentStep(4);
        performEarningsAnalysis();
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performNewsAnalysisWithStocks = (stocks: StockData[]) => {
    setIsLoading(true);

    const newsMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>📰 Intelligent News Analytics</strong><br>Searching and analyzing the latest relevant stock news for selected companies...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newsMessage]);

    const timeout = setTimeout(() => {
      const newsResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>📈 News Analysis Complete</strong><br>Market sentiment analysis shows positive developments for selected stocks. Recent news indicates strong fundamentals.",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newsResults]);
      setIsLoading(false);

      // Continue to data analytics
      const timeout2 = setTimeout(() => {
        setCurrentStep(6);
        performDataAnalysisWithStocks(stocks);
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const handleGeneralQuery = async (query: string) => {
    try {
      setIsLoading(true);

      const thinkingMsg = await createAgentMessage(
        `<strong>🤔 Processing Your Question</strong><br>Let me help you with that...`,
      );
      setMessages((prev) => [...prev, thinkingMsg]);

      console.log("💬 Calling general Q&A API for:", query);

      // ✅ 调用通用 Q&A API
      const response = await fetch(`${LOCAL_API_BASE_URL}/api/general-qa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`API failed: ${response.status}`);
      }

      const qaData = await response.json();

      if (!qaData.success) {
        throw new Error(qaData.error || "Invalid response");
      }

      // ✅ 显示回答
      const answerMsg = await createAgentMessage(qaData.answer);
      setMessages((prev) => [...prev, answerMsg]);
    } catch (error) {
      console.error("General Q&A error:", error);

      const errorMsg = await createAgentMessage(
        `<strong>❌ Error</strong><br>Unable to process your question. ${error instanceof Error ? error.message : "Unknown error"}<br><br>
        <strong>💡 I can help with:</strong><br>
        • 📰 News: "Latest news on Apple"<br>
        • 💰 Valuation: "Should I buy Tesla?"<br>
        • 📊 Performance: "How is Microsoft doing?"<br>
        • 🔍 Screening: "Best stocks in Technology?"`,
      );
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const performDataAnalysisWithStocks = (stocks: StockData[]) => {
    setIsLoading(true);

    const dataMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>📊 Data Analytics</strong><br>Processing financial datasets and market data for selected stocks...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, dataMessage]);

    const timeout = setTimeout(() => {
      const dataResults: Message = {
        id: messages.length + 2,
        content: `<strong>📈 Financial Data Analysis:</strong><br>${stocks
          .map(
            (stock) =>
              `• <strong>${stock.symbol}</strong>: P/E ${stock.pe}, Strong fundamentals`,
          )
          .join("<br>")}`,
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, dataResults]);
      setIsLoading(false);

      // Continue to earnings analysis
      const timeout2 = setTimeout(() => {
        setCurrentStep(7);
        performEarningsAnalysisWithStocks(stocks);
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performDCFAnalysis = (stocks: StockData[]) => {
    const dcfMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>💰 Valuation Model Selection</strong><br>Running comprehensive valuation models (DCF, P/E, PEG) to determine intrinsic values...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, dcfMessage]);

    const timeout4 = setTimeout(() => {
      const dcfResults: Message = {
        id: messages.length + 2,
        content: `<strong>📈 Valuation Analysis Results:</strong><br>${stocks
          .map((stock) => {
            const upside = (
              ((stock.dcfValue - stock.price) / stock.price) *
              100
            ).toFixed(1);
            return `• <strong>${stock.symbol}</strong>: Current $${stock.price} → Fair Value $${stock.dcfValue} (${upside}% upside)`;
          })
          .join(
            "<br>",
          )}<br><br><em>Analysis shows significant upside potential across recommended stocks.</em>`,
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, dcfResults]);
      setIsLoading(false);

      // Continue to observations
      const timeout5 = setTimeout(() => {
        setCurrentStep(stockSelectionMode ? 9 : 6);
        performObservationsAnalysis(stocks);
      }, 3000);
      timeoutsRef.current.push(timeout5);
    }, 3000);
    timeoutsRef.current.push(timeout4);
  };

  const performEarningsAnalysisWithStocks = (stocks: StockData[]) => {
    setIsLoading(true);

    const earningsMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>📞 Earnings Call Analysis</strong><br>Analyzing latest earnings transcripts and management guidance...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, earningsMessage]);

    const timeout = setTimeout(() => {
      const earningsResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>📊 Earnings Analysis Complete</strong><br>Management guidance indicates strong growth prospects. Earnings quality shows consistent performance across selected stocks.",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, earningsResults]);
      setIsLoading(false);

      // Continue to valuation analysis
      const timeout2 = setTimeout(() => {
        setCurrentStep(8);
        performDCFAnalysis(stocks);
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performObservationsAnalysis = (stocks: StockData[]) => {
    setIsLoading(true);

    const obsMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>🔍 Observations & Key Insights</strong><br>Summarizing key insights from comprehensive analysis...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, obsMessage]);

    const timeout = setTimeout(() => {
      const obsResults: Message = {
        id: messages.length + 2,
        content: `<strong>💡 Key Observations:</strong><br>• Strong fundamental performance across selected stocks<br>• Positive market sentiment and news coverage<br>• Valuation models indicate significant upside potential<br>• Management guidance supports growth thesis`,
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, obsResults]);
      setIsLoading(false);

      // Continue to final summary
      const timeout2 = setTimeout(() => {
        setCurrentStep(stockSelectionMode ? 10 : 7);
        performFinalSummary(stocks);
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performFinalSummary = (stocks: StockData[]) => {
    setIsLoading(true);

    const summaryMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>📋 Final Summary & Recommendations</strong><br>Compiling comprehensive investment recommendations...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, summaryMessage]);

    const timeout = setTimeout(() => {
      const summaryResults: Message = {
        id: messages.length + 2,
        content: `<strong>✅ Investment Recommendations:</strong><br>${stocks
          .map((stock) => {
            const upside = (
              ((stock.dcfValue - stock.price) / stock.price) *
              100
            ).toFixed(1);
            return `• <strong>${stock.symbol}</strong>: ${stock.recommendation} - ${upside}% potential upside`;
          })
          .join(
            "<br>",
          )}<br><br><strong>Conclusion:</strong> Based on comprehensive analysis, the selected stocks show strong investment potential with favorable risk-return profiles. Consider portfolio diversification and risk tolerance before investing.`,
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, summaryResults]);
      setIsLoading(false);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performEarningsAnalysis = () => {
    setIsLoading(true);

    const performEarningsAnalysisAsync = async () => {
      const earningsMessage: Message = {
        id: messages.length + 1,
        content:
          "<strong>📞 Earnings Call Analysis</strong><br>Analyzing latest earnings transcripts and management guidance...",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, earningsMessage]);

      const timeout7 = setTimeout(() => {
        const earningsResults: Message = {
          id: messages.length + 2,
          content:
            "<strong>📈 Earnings Insights:</strong><br>• Strong revenue growth across key sectors<br>• Management guidance indicates continued expansion<br>• Earnings quality shows sustainable business models<br>• Forward-looking statements suggest positive momentum<br><br><em>Earnings analysis supports investment thesis with strong fundamentals.</em>",
          sender: "agent",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, earningsResults]);
        setIsLoading(false);

        // Step 5: Valuation Analysis
        const timeout8 = setTimeout(() => {
          setCurrentStep(5);
          performValuationAnalysis();
        }, 3000);
        timeoutsRef.current.push(timeout8);
      }, 3000);
      timeoutsRef.current.push(timeout7);
    };

    performEarningsAnalysisAsync();
  };

  const performValuationAnalysis = () => {
    setIsLoading(true);

    const valuationMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>💰 Valuation Model Selection</strong><br>Running comprehensive valuation models to determine fair values...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, valuationMessage]);

    const timeout = setTimeout(() => {
      const valuationResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>📊 Valuation Analysis Complete</strong><br>Multiple valuation models applied. DCF, P/E, and comparable analysis indicate attractive valuations in current market conditions.",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, valuationResults]);
      setIsLoading(false);

      // Continue to observations
      const timeout2 = setTimeout(() => {
        setCurrentStep(6);
        performGeneralObservations();
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performGeneralObservations = () => {
    setIsLoading(true);

    const obsMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>🔍 Observations & Key Insights</strong><br>Summarizing key insights from comprehensive analysis...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, obsMessage]);

    const timeout = setTimeout(() => {
      const obsResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>💡 Key Observations:</strong><br>• Current market conditions present attractive opportunities<br>• Strong fundamental drivers across analyzed sectors<br>• Valuation metrics indicate selective value creation<br>• Risk-adjusted returns appear favorable",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, obsResults]);
      setIsLoading(false);

      // Continue to final summary
      const timeout2 = setTimeout(() => {
        setCurrentStep(7);
        performGeneralSummary();
      }, 3000);
      timeoutsRef.current.push(timeout2);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const performGeneralSummary = () => {
    setIsLoading(true);

    const summaryMessage: Message = {
      id: messages.length + 1,
      content:
        "<strong>📋 Final Summary & Balanced Conclusion</strong><br>Providing balanced investment perspective based on analysis...",
      sender: "agent",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, summaryMessage]);

    const timeout = setTimeout(() => {
      const summaryResults: Message = {
        id: messages.length + 2,
        content:
          "<strong>✅ Balanced Investment Conclusion:</strong><br>Based on comprehensive analysis, current market conditions present both opportunities and risks. Strong fundamental analysis supports selective investment approaches with appropriate risk management. Consider diversification and individual risk tolerance when making investment decisions.",
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, summaryResults]);
      setIsLoading(false);
    }, 3000);
    timeoutsRef.current.push(timeout);
  };

  const [leftNavOpen, setLeftNavOpen] = useState(false);
  const [isChineseMode, setIsChineseMode] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGreetingCollapsed, setIsGreetingCollapsed] = useState(false);

  // Translation function with caching to prevent drift
  const toggleChineseMode = async () => {
    if (isTranslating) return;

    const newMode = !isChineseMode;

    if (newMode) {
      // Switch to Chinese mode
      setIsTranslating(true);
      setIsChineseMode(true);

      // ✅ Add feedback message for user
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          content:
            "<strong>🌐 Checkit分析师正在为您翻译中...</strong><br><em>请稍后。。。.</em>",
          sender: "agent",
          timestamp: new Date(),
        },
      ]);

      try {
        const translatedMessages = await Promise.all(
          messages.map(async (msg) => {
            // If we already have Chinese translation cached, use it
            if (msg.contentZh) {
              return {
                ...msg,
                content: msg.contentZh,
              };
            }

            // Otherwise, translate and cache it
            try {
              const englishContent = msg.contentEn || msg.content;

              const response = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  text: englishContent,
                  targetLanguage: "zh-CN",
                }),
              });

              const data = await response.json();
              const chineseContent = data.success
                ? data.translatedText
                : englishContent;

              return {
                ...msg,
                content: chineseContent,
                contentEn: englishContent,
                contentZh: chineseContent,
              };
            } catch (error) {
              console.error("Translation error:", error);
              return msg;
            }
          }),
        );

        setMessages(translatedMessages);

        // ✅ After translation completes successfully
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content: "<strong>✅ 翻译完成!</strong>",
            sender: "agent",
            timestamp: new Date(),
          },
        ]);

        // 🧹 Remove the "translating..." message after 3 seconds
        setTimeout(() => {
          setMessages((prev) =>
            prev.filter(
              (msg) => !msg.content.includes("Checkit分析师正在为您翻译中"),
            ),
          );
        }, 3000);
      } catch (error) {
        console.error("Translation error:", error);

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            content:
              "<strong>❌ Translation failed. Please try again.</strong>",
            sender: "agent",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsTranslating(false);
      }
    } else {
      // Switch to English mode - use cached English version
      setIsChineseMode(false);
      const englishMessages = messages.map((msg) => ({
        ...msg,
        content: msg.contentEn || msg.content,
      }));
      setMessages(englishMessages);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Left Vertical Specialist Buttons - Desktop */}
      <div className="hidden lg:flex w-auto min-w-[120px] max-w-[200px] bg-white shadow-lg flex-col gap-2 p-2 border-r sticky top-0 h-screen overflow-y-auto">
        <button
          onClick={() => window.open("https://checkitanalytics.com/", "_blank")}
          className="
            w-full
            h-8
            px-2
            bg-gray-50 hover:bg-gray-100
            text-gray-600
            rounded-md
            border border-gray-200
            transition-all duration-150
            flex items-center gap-1.5
            text-[11px] font-bold
          "
          data-testid="main-page-button"
          title={isChineseMode ? "主页" : "Main Page"}
        >
          <span className="text-sm leading-none">🏠</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "主页" : "Main Page"}
          </span>
        </button>

        <button
          onClick={() =>
            window.open("https://smartnews.checkitanalytics.com/", "_blank")
          }
          className="px-1.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md border border-blue-200 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="intelligent-news-analyst-button"
          title={isChineseMode ? "智能新闻分析师" : "Smart News Analyst"}
        >
          <span className="text-sm">📰</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "智能新闻分析师" : "News Analyst"}
          </span>
        </button>

        <button
          onClick={() =>
            window.open("https://smartnews.checkitanalytics.com/rag", "_blank")
          }
          className="px-1.5 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-md border border-green-200 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="earning-call-specialist-button"
          title={isChineseMode ? "财报会议智能助手" : "Earning Call Specialist"}
        >
          <span className="text-sm">📞</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "财报会议智能助手" : "Earnings Specialist"}
          </span>
        </button>

        <button
          onClick={() =>
            window.open("https://valuation.checkitanalytics.com/", "_blank")
          }
          className="px-1.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md border border-purple-200 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="valuation-expert-button"
          title={isChineseMode ? "估值专家" : "Valuation Expert"}
        >
          <span className="text-sm">💰</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "估值专家" : "Valuation Expert"}
          </span>
        </button>

        <button
          onClick={() =>
            window.open("https://keymetrics.checkitanalytics.com/", "_blank")
          }
          className="px-1.5 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-md border border-orange-200 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="intelligent-data-analyst-button"
          title={isChineseMode ? "智能数据分析师" : "Intelligent Data Analyst"}
        >
          <span className="text-sm">📊</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "智能数据分析师" : "Data Analyst"}
          </span>
        </button>

        <button
          onClick={() =>
            window.open("https://fdacalendar.checkitanalytics.com/", "_blank")
          }
          className="px-1.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md border border-red-200 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="fda-calendar-button"
          title={isChineseMode ? "FDA 药审日历" : "FDA Calendar"}
        >
          <span className="text-sm">📅</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "FDA 药审日Na�" : "FDA Calendar"}
          </span>
        </button>

        <button
          onClick={() =>
            window.open(
              "https://industryanalysis.checkitanalytics.com/",
              "_blank",
            )
          }
          className="px-2 py-1.5 bg-[#22C7A5] hover:bg-[#1BB89A] text-white rounded-md transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="Industry-Analysis-button"
          title={isChineseMode ? "行业竞争力分析" : "Industry Analysis"}
        >
          <span className="text-sm">🏭</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode ? "行业竞争力分析" : "Industry Analysis"}
          </span>
        </button>

        <button
          className="px-1.5 py-1 bg-gray-100 text-gray-400 cursor-not-allowed rounded-md border border-gray-200 transition-all duration-200 flex items-center gap-1 text-[11px] font-bold whitespace-nowrap w-full"
          data-testid="Stock-Picker-button"
          title={
            isChineseMode ? "智能选股 (即将上线)" : "Stock Picker (coming soon)"
          }
          disabled
        >
          <span className="text-sm">💼</span>
          <span className="truncate leading-none font-bold">
            {isChineseMode
              ? "智能选股 (即将上线)"
              : "Stock Picker (coming soon)"}
          </span>
        </button>

        {/* Chinese Translation Toggle*/}
        <button
          onClick={toggleChineseMode}
          disabled={isTranslating}
          className={`mt-2 px-2 py-1.5 ${
            isChineseMode
              ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200"
          } rounded-md border transition-all duration-200 flex items-center gap-1.5 text-xs font-bold text-left justify-start w-full ${
            isTranslating ? "opacity-50 cursor-not-allowed" : ""
          }`}
          data-testid="chinese-toggle-button-sidebar"
          title={isChineseMode ? "Switch to English" : "切换到中文"}
        >
          <span>{isChineseMode ? "🇺🇸" : "🇨🇳"}</span>
          <span>{isChineseMode ? "EN" : "中文"}</span>
        </button>
      </div>

      {/* Mobile Left Navigation - Fixed positioning with proper z-index */}
      {leftNavOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
            onClick={() => setLeftNavOpen(false)}
            data-testid="mobile-nav-overlay"
          />

          {/* Navigation drawer */}
          <div className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl z-50 lg:hidden">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-indigo-700">
                  {isChineseMode ? "功能导航" : "Navigation"}
                </h3>
                <button
                  onClick={() => setLeftNavOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-md touch-manipulation"
                  data-testid="close-left-nav-button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={() => {
                  window.open("https://checkitanalytics.com/", "_blank");
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-md border border-gray-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="main-page-button-mobile"
                title={isChineseMode ? "主页" : "Main Page"}
              >
                <span className="text-sm leading-none">🏠</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode ? "主页" : "Main Page"}
                </span>
              </button>
              <button
                onClick={() => {
                  window.open(
                    "https://smartnews.checkitanalytics.com/",
                    "_blank",
                  );
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md border border-blue-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="intelligent-news-analyst-button-mobile"
                title={
                  isChineseMode
                    ? "智能新闻分析师"
                    : "Intelligent Stock News Analyst"
                }
              >
                <span className="text-sm leading-none">📰</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode
                    ? "智能新闻分析师"
                    : "Intelligent Stock News Analyst"}
                </span>
              </button>
              <button
                onClick={() => {
                  window.open(
                    "https://smartnews.checkitanalytics.com/rag",
                    "_blank",
                  );
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-md border border-green-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="earning-call-specialist-button-mobile"
                title={
                  isChineseMode ? "财报会议智能助手" : "Earning Call Specialist"
                }
              >
                <span className="text-sm leading-none">📞</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode
                    ? "财报会议智能助手"
                    : "Earning Call Specialist"}
                </span>
              </button>
              <button
                onClick={() => {
                  window.open(
                    "https://valuation.checkitanalytics.com/",
                    "_blank",
                  );
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded-md border border-purple-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="valuation-expert-button-mobile"
                title={isChineseMode ? "估值专家" : "Valuation Expert"}
              >
                <span className="text-sm leading-none">💰</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode ? "估值专家" : "Valuation Expert"}
                </span>
              </button>
              <button
                onClick={() => {
                  window.open(
                    "https://keymetrics.checkitanalytics.com/",
                    "_blank",
                  );
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-md border border-orange-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="intelligent-data-analyst-button-mobile"
                title={
                  isChineseMode ? "智能数据分析师" : "Intelligent Data Analyst"
                }
              >
                <span className="text-sm leading-none">📊</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode
                    ? "智能数据分析师"
                    : "Intelligent Data Analyst"}
                </span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    "https://fdacalendar.checkitanalytics.com/",
                    "_blank",
                  );
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-md border border-red-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="fda-calendar-button-mobile"
                title={isChineseMode ? "FDA 药审日历" : "FDA Calendar"}
              >
                <span className="text-sm leading-none">📅</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode ? "FDA 药审日历" : "FDA Calendar"}
                </span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    "https://industryanalysis.checkitanalytics.com/",
                    "_blank",
                  );
                  setLeftNavOpen(false);
                }}
                className="w-full h-8 px-2 bg-[#22C7A5]/10 hover:bg-[#22C7A5]/20 text-[#22C7A5] rounded-md transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="Industry-Analysis-button-mobile"
                title={isChineseMode ? "行业竞争力分析" : "Industry Analysis"}
              >
                <span className="text-sm leading-none">🏭</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode ? "行业竞争力分析" : "Industry Analysis"}
                </span>
              </button>

              <button
                className="w-full h-8 px-2 bg-gray-100 text-gray-400 cursor-not-allowed rounded-md border border-gray-200 transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold"
                data-testid="Stock-Picker-button-mobile"
                title={
                  isChineseMode
                    ? "智能选股 (即将上线)"
                    : "Stock Picker (coming soon)"
                }
                disabled
              >
                <span className="text-sm leading-none">💼</span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode
                    ? "智能选股 (即将上线)"
                    : "Stock Picker (coming soon)"}
                </span>
              </button>

              {/* Chinese Toggle - Mobile */}
              <button
                onClick={() => {
                  toggleChineseMode();
                  setLeftNavOpen(false);
                }}
                disabled={isTranslating}
                className={`w-full h-8 px-2 ${
                  isChineseMode
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                } rounded-md border transition-all duration-150 flex items-center gap-1.5 text-[11px] font-bold touch-manipulation ${
                  isTranslating ? "opacity-50 cursor-not-allowed" : ""
                } `}
                data-testid="chinese-toggle-button-mobile"
                title={isChineseMode ? "Switch to English" : "切换到中文"}
              >
                <span className="text-sm leading-none">
                  {isChineseMode ? "🇺🇸" : "🇨🇳"}
                </span>
                <span className="truncate leading-none font-bold">
                  {isChineseMode ? "EN" : "中文"}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
      {/* Main Content */}
      <div className="flex-1 flex flex-col w-full">
        {/* Header */}
        <header className="px-3 lg:px-6 py-3 lg:py-4 shadow bg-white flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Mobile Navigation Button */}
            <button
              onClick={() => setLeftNavOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
              data-testid="open-left-nav-button"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>

            <img
              src={logoImage}
              alt="Checkit Analytics Logo"
              className="h-14 w-14 object-contain rounded-md"
            />
            {/* <div>
              <p className="text-xs lg:text-sm text-gray-500 hidden sm:block">
                {isChineseMode
                  ? "AI驱动的股票投研分析师"
                  : "AI-Powered Equity Research Analyst"}
              </p>
            </div> */}
          </div>
        </header>

        {/* Single Panel: Checkit Equity Research Assistant */}
        <div className="flex-1 p-2 lg:p-2 min-h-0">
          <div className="h-full flex flex-col bg-white rounded-lg shadow-md relative">
            {" "}
            {/* 添加 relative */}
            <div className="p-3 lg:p-2 flex flex-col h-full min-h-0">
              {/* 标题部分 - 固定 */}
              <div className="flex items-center mb-2 lg:mb-3 flex-shrink-0">
                <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-indigo-600 mr-2" />
                <h2 className="text-sm lg:text-base font-bold text-indigo-700">
                  {isChineseMode
                    ? "Checkit 股票投研分析师"
                    : "Checkit Equity Research Analyst"}
                </h2>
              </div>

              {/* 初始状态：显示完整欢迎消息 */}
              {messages.length === 1 && messages[0].sender === "agent" && (
                <div className="mb-2 lg:mb-3 flex-shrink-0 transition-all duration-500">
                  <div className="p-2 lg:p-3 rounded-2xl shadow-sm text-sm lg:text-sm bg-white text-gray-800 border border-gray-200">
                    <div
                      dangerouslySetInnerHTML={{ __html: messages[0].content }}
                      className="leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* 用户提问后：显示可折叠的提示信息 */}
              {messages.length > 1 && (
                <div className="mb-2 lg:mb-3 flex-shrink-0 transition-all duration-300">
                  <div className="bg-gray-100 rounded-lg border border-gray-200">
                    <button
                      onClick={() =>
                        setIsGreetingCollapsed(!isGreetingCollapsed)
                      }
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-200 transition-colors duration-200 rounded-lg"
                      data-testid="greeting-toggle-button"
                    >
                      <span className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <span>💡</span>
                        <span>{isChineseMode ? "使用提示" : "Usage Tips"}</span>
                      </span>
                      <span
                        className="text-gray-500 transition-transform duration-200"
                        style={{
                          transform: isGreetingCollapsed
                            ? "rotate(0deg)"
                            : "rotate(180deg)",
                        }}
                      >
                        ▼
                      </span>
                    </button>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        isGreetingCollapsed ? "max-h-0" : "max-h-96"
                      }`}
                    >
                      <div className="p-3 pt-0">
                        <div
                          className="text-xs lg:text-sm text-gray-600 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: messages[0].content,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 初始状态：输入框在欢迎消息下方 */}
              {messages.length === 1 && (
                <div className="mb-2 lg:mb-3 flex-shrink-0">
                  <div className="flex gap-1 lg:gap-2 w-full max-w-2xl mx-auto">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about investments..."
                      className="flex-1 border border-gray-300 rounded-l-lg p-2 lg:p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px] text-sm lg:text-base"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="rounded-r-lg bg-indigo-600 hover:bg-indigo-700 min-w-[44px] min-h-[44px] px-3 lg:px-4 text-sm lg:text-base"
                      data-testid="button-send"
                    >
                      Ask
                    </Button>
                  </div>
                </div>
              )}

              {/* 消息区域 - 可滚动 */}
              <div
                className="flex-1 overflow-y-auto bg-gray-50 rounded-lg"
                style={{ paddingBottom: messages.length > 1 ? "80px" : "0" }}
              >
                <div className="px-2 lg:px-8 py-4 ml-0 lg:ml-12 xl:ml-20">
                  {messages
                    .filter((msg) => msg.id !== 1)
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`message mb-2 lg:mb-3 ${message.sender === "user" ? "ml-auto" : "mr-auto"}`}
                      >
                        <div
                          className={`p-2 lg:p-3 rounded-2xl shadow-sm text-xs lg:text-sm max-w-[95%] lg:max-w-[90%] ${
                            message.sender === "user"
                              ? "bg-indigo-600 text-white border border-indigo-700"
                              : "bg-white text-gray-800 border border-gray-200"
                          }`}
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: message.content,
                            }}
                            className="leading-relaxed"
                          />
                        </div>

                        {/* Follow-up Modules */}
                        {message.sender === "agent" &&
                          message.modules &&
                          message.modules.length > 0 && (
                            <div className="mt-2 lg:mt-3 space-y-2 max-w-[95%] lg:max-w-[90%]">
                              {message.modules
                                .filter((m) => MODULE_META[m])
                                .map((moduleKey) => {
                                  const meta = MODULE_META[moduleKey];
                                  const isMessageInChinese =
                                    !!message.contentZh;
                                  const label = isMessageInChinese
                                    ? meta.labelZh
                                    : meta.label;
                                  return (
                                    <div
                                      key={moduleKey}
                                      className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-indigo-500 rounded-lg p-3 text-xs lg:text-sm"
                                      data-testid={`follow-up-${moduleKey}`}
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-base lg:text-lg">
                                          {meta.icon}
                                        </span>
                                        <span className="font-semibold text-gray-700">
                                          {isMessageInChinese
                                            ? "💬 想深入了解？"
                                            : "💬 Want to go deeper?"}
                                        </span>
                                      </div>
                                      <p className="text-gray-600 mb-2">
                                        {isMessageInChinese
                                          ? `从侧边栏打开 ${label} 以探索更多详情。`
                                          : `Open ${label} from the sidebar to explore more details.`}
                                      </p>
                                      <button
                                        onClick={() =>
                                          window.open(meta.url, "_blank")
                                        }
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-all duration-200 text-xs lg:text-sm font-medium touch-manipulation min-h-[36px]"
                                        data-testid={`button-open-${moduleKey}`}
                                      >
                                        {isMessageInChinese
                                          ? `打开 ${label}`
                                          : `Open ${label}`}
                                      </button>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                        {/* Industry Selector */}
                        {message.showIndustrySelector && (
                          <div className="mt-2 lg:mt-3 grid grid-cols-2 lg:grid-cols-3 gap-1.5 lg:gap-2 max-w-[95%] lg:max-w-[90%]">
                            {industries.map((industry) => (
                              <button
                                key={industry}
                                onClick={() => handleIndustrySelect(industry)}
                                className="p-2 lg:p-2 text-xs lg:text-sm bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg transition-all duration-200 hover:border-indigo-300 touch-manipulation min-h-[44px]"
                                data-testid={`industry-${industry.toLowerCase()}`}
                              >
                                {industry}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                  {/* Loading状态 */}
                  {isLoading && (
                    <div className="message mb-2 lg:mb-3 mr-auto">
                      <div className="bg-white text-gray-800 p-2 lg:p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-2 lg:gap-3 text-xs lg:text-sm max-w-[95%] lg:max-w-[90%]">
                        <div className="loading-spinner w-4 h-4 lg:w-5 lg:h-5"></div>
                        <span>Analyzing market data...</span>
                      </div>
                    </div>
                  )}

                  {/* 滚动锚点 */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* 用户提问后：输入框固定在底部 */}
              {messages.length > 1 && (
                <div
                  className="absolute bottom-0 left-0 bg-white pt-3 pb-3 px-2 lg:px-4"
                  style={{ right: "20px", left: "20px" }}
                >
                  <div className="flex gap-2 max-w-4xl mx-auto">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        isChineseMode
                          ? "询问投资相关问题..."
                          : "Ask about investments..."
                      }
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm lg:text-base"
                      data-testid="input-message-bottom"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isLoading}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium min-h-[40px]"
                      data-testid="button-send-bottom"
                    >
                      {isChineseMode ? "询问" : "Ask"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
