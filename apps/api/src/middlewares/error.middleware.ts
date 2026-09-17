import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Array<{ field?: string; message: string }>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";
  res.status(404).json({
    success: false,
    error: {
      code: "RESOURCE_NOT_FOUND",
      message: `Tài nguyên '${req.method} ${req.originalUrl}' không tồn tại trên hệ thống.`,
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";
  const timestamp = new Date().toISOString();

  const isAppError =
    err instanceof AppError ||
    (typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode: unknown }).statusCode === "number" &&
      "code" in err);

  if (isAppError) {
    const appErr = err as AppError;
    res.status(appErr.statusCode).json({
      success: false,
      error: {
        code: appErr.code,
        message: appErr.message,
        details: appErr.details,
        requestId,
        timestamp,
      },
    });
    return;
  }

  const isZodError =
    err instanceof ZodError ||
    (typeof err === "object" && err !== null && (err as { name?: string }).name === "ZodError");

  if (isZodError) {
    const zodErr = err as ZodError;
    const details = (zodErr.errors || zodErr.issues || []).map((e) => ({
      field: Array.isArray(e.path) ? e.path.join(".") : String(e.path),
      message: e.message,
    }));
    res.status(422).json({
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Dữ liệu gửi lên không đúng định dạng.",
        details,
        requestId,
        timestamp,
      },
    });
    return;
  }

  // SyntaxError (JSON parse error)
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Định dạng JSON gửi lên không hợp lệ.",
        requestId,
        timestamp,
      },
    });
    return;
  }

  console.error(`[Unhandled Error] [${requestId}]`, err);

  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Đã xảy ra lỗi nội bộ trên máy chủ.",
      requestId,
      timestamp,
    },
  });
}
