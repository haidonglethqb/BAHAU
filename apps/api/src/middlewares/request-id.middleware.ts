import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers["x-request-id"];
  let requestId: string;

  if (typeof incomingId === "string" && UUID_REGEX.test(incomingId)) {
    requestId = incomingId;
  } else {
    requestId = crypto.randomUUID();
  }

  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}
