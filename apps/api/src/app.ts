import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import v1Router from "./routes/v1/index.js";
import { initEventSubscribers } from "./events/index.js";

export function createApp(): Express {
  // Khởi tạo Decoupled Event-Driven Bus & Subscribers
  initEventSubscribers();

  const app = express();


  // Security headers
  app.use(helmet());

  // CORS whitelist configuration (OWASP Compliant)
  const allowedOrigins = process.env["CORS_ALLOWED_ORIGINS"]
    ? process.env["CORS_ALLOWED_ORIGINS"].split(",").map((s) => s.trim())
    : [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
      ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Cho phép các yêu cầu nội bộ hoặc không có Origin header (Postman, server-to-server)
        if (!origin) return callback(null, true);

        const isExplicitlyAllowed = allowedOrigins.includes(origin);
        const isLocalDev =
          process.env["NODE_ENV"] !== "production" &&
          (/^http:\/\/localhost(:\d+)?$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin));

        if (isExplicitlyAllowed || isLocalDev) {
          return callback(null, true);
        }

        // Từ chối origin không được tin cậy
        return callback(null, false);
      },
      credentials: true,
    })
  );

  // Parsers & Tracing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(authenticate);

  // API Routes
  app.use("/api/v1", v1Router);

  // 404 Handler
  app.use(notFoundHandler);

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
