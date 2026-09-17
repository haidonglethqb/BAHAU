import { Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];

  const { sessionId, expiresAt, user } = await AuthService.login(
    email,
    password,
    ipAddress,
    userAgent
  );

  // Set Cookie HttpOnly an toàn
  res.cookie("bahau_session", sessionId, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: {
      user,
      message: "Đăng nhập thành công",
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const sessionId = req.sessionId || req.cookies?.["bahau_session"];

  if (sessionId) {
    await AuthService.logout(sessionId);
  }

  res.clearCookie("bahau_session", { path: "/" });

  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: {
      message: "Đăng xuất thành công",
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: {
      user: req.user,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
