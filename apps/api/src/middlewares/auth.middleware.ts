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
  const sessionId =
    req.cookies?.["bahau_session"] ||
    (req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined);

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

export function requirePermission(permissionCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện thao tác này.");
    }
    if (!req.user.permissions.includes(permissionCode)) {
      throw new AppError(
        403,
        "FORBIDDEN",
        `Bạn không có quyền '${permissionCode}' để thực hiện thao tác này.`
      );
    }
    next();
  };
}

export function requireRole(roleCode: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện thao tác này.");
    }
    if (!req.user.roles.includes(roleCode)) {
      throw new AppError(
        403,
        "FORBIDDEN",
        `Thao tác này chỉ dành cho vai trò '${roleCode}'.`
      );
    }
    next();
  };
}
