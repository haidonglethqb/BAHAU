import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service.js";
import { AppError } from "./error.middleware.js";
import type { AuthUser } from "@bahau/contracts";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : undefined;
  const sessionId = bearerToken || req.cookies?.["bahau_session"];

  if (!sessionId) {
    return next();
  }

  try {
    const user = await AuthService.getSessionUser(sessionId);
    if (user) {
      req.user = user;
      req.sessionId = sessionId;
    }
  } catch (err) {
    console.error("[Auth Middleware] Error resolving session:", err);
  }

  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện thao tác này.");
  }
  next();
}

export function requirePermission(...permissionCodes: Array<string | string[]>) {
  const permissions = permissionCodes.flat();
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện thao tác này.");
    }
    const hasPermission =
      permissions.length > 0 && permissions.some((p) => req.user!.permissions.includes(p));
    if (!hasPermission) {
      throw new AppError(
        403,
        "FORBIDDEN",
        `Bạn không có quyền '${permissions.join(" / ")}' để thực hiện thao tác này.`
      );
    }
    next();
  };
}

export function requireRole(...roleCodes: Array<string | string[]>) {
  const roles = roleCodes.flat();
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện thao tác này.");
    }
    const hasRole = roles.length > 0 && roles.some((r) => req.user!.roles.includes(r));
    if (!hasRole) {
      throw new AppError(
        403,
        "FORBIDDEN",
        `Thao tác này chỉ dành cho vai trò: ${roles.join(", ")}.`
      );
    }
    next();
  };
}
