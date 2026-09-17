import express, { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requestIdMiddleware } from "./middlewares/request-id.middleware.js";
import { authenticate } from "./middlewares/auth.middleware.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import v1Router from "./routes/v1/index.js";

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: true,
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
