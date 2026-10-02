import { Request, Response } from "express";
import { ExecutiveService } from "../services/executive.service.js";

export async function getSalaryIncrements(req: Request, res: Response): Promise<void> {
  const candidates = await ExecutiveService.getSalaryIncrementCandidates();

  res.status(200).json({
    success: true,
    data: candidates,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function generateResolution(req: Request, res: Response): Promise<void> {
  const resolution = ExecutiveService.generateOfficialResolution(req.body);

  res.status(200).json({
    success: true,
    data: resolution,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}
