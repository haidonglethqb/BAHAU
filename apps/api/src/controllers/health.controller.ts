import { Request, Response } from "express";
import { prisma } from "@bahau/database";

export async function getHealth(req: Request, res: Response): Promise<void> {
  let dbStatus = "disconnected";

  try {
    // Quick query with 2s timeout check
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 2000)),
    ]);
    dbStatus = "connected";
  } catch {
    dbStatus = "disconnected";
  }

  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: {
      status: "ok",
      uptime: process.uptime(),
      version: "1.0.0",
      database: dbStatus,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
