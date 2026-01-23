// server/index.ts
import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

const rawCorsOrigins = process.env.CORS_ORIGIN || "";
const corsOrigins = rawCorsOrigins
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOriginMatchers = corsOrigins
  .map((origin) => {
    if (origin.startsWith("/") && origin.endsWith("/") && origin.length > 2) {
      try {
        return new RegExp(origin.slice(1, -1));
      } catch {
        return origin;
      }
    }
    return origin;
  })
  .filter(Boolean);

// ✅ 0. CORS 配置（必须放最前面）
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }
      if (corsOrigins.length === 0 || corsOrigins.includes("*")) {
        return callback(null, true);
      }
      const isAllowed = corsOriginMatchers.some((matcher) => {
        if (matcher instanceof RegExp) {
          return matcher.test(origin);
        }
        return matcher === origin;
      });
      if (isAllowed) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// ✅ 1. 基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ 2. 日志中间件(放在最前面)
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  // ✅ 3. 注册所有 API 路由(在 routes.ts 中定义)
  const server = await registerRoutes(app);

  // ✅ 4. 错误处理中间件
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("❌ Error:", err); // 记录错误
    res.status(status).json({ message });
    // ❌ 不要 throw err
  });

  // ✅ 5. Vite/静态文件(最后)
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`✅ Server listening on port ${port}`);
    },
  );
})();
