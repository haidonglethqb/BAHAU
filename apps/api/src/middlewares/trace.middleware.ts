import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      traceId?: string;
    }
  }
}

export function traceIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const incomingTraceId =
    req.headers["x-trace-id"] || req.headers["x-correlation-id"];

  let traceId: string;
  if (typeof incomingTraceId === "string" && incomingTraceId.trim().length > 0) {
    traceId = incomingTraceId.trim();
  } else {
    traceId = `trace-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  }

  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);
  next();
}
