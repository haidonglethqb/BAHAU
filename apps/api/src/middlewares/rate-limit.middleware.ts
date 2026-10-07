import { Request, Response, NextFunction } from "express";
import { AppError } from "./error.middleware.js";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter(options: RateLimitOptions) {
  const windowMs = options.windowMs;
  const max = options.max;
  const message = options.message || "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.";
  const keyGen =
    options.keyGenerator ||
    ((req: Request) => req.ip || req.socket.remoteAddress || "unknown");

  const hits = new Map<string, { count: number; resetTime: number }>();

  // Dọn dẹp bộ nhớ định kỳ
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of hits.entries()) {
      if (now > data.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));
  if (cleanupInterval.unref) cleanupInterval.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Cho phép bỏ qua trong môi trường kiểm thử trừ khi bật cờ x-test-rate-limit
    if (process.env["NODE_ENV"] === "test" && !req.headers["x-test-rate-limit"]) {
      return next();
    }

    const key = keyGen(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > max) {
      res.setHeader("Retry-After", resetSeconds);
      throw new AppError(429, "RATE_LIMIT_EXCEEDED", message);
    }

    next();
  };
}

// Giới hạn tần suất đăng nhập chống Brute-force & CPU DoS
export const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: "Quá nhiều lần gửi yêu cầu đăng nhập. Vui lòng thử lại sau 5 phút.",
});

// Giới hạn tần suất truy vấn Trợ lý AI
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: "Bạn đã vượt quá giới hạn truy vấn AI cho phép. Vui lòng thử lại sau 1 phút.",
  keyGenerator: (req) => req.user?.id || req.ip || req.socket.remoteAddress || "anon",
});
