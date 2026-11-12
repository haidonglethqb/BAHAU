import { Request, Response } from "express";
import { ExecutiveService } from "../services/executive.service.js";
import { AppError } from "../middlewares/error.middleware.js";

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

export async function signResolution(req: Request, res: Response): Promise<void> {
  const signed = await ExecutiveService.signResolution(req.body);

  res.status(200).json({
    success: true,
    data: signed,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function verifyResolution(req: Request, res: Response): Promise<void> {
  const pathSuffix =
    typeof req.path === "string"
      ? req.path.replace(/^\/executive\/verify\/?/, "")
      : "";
  const rawParam = req.params[0] ?? req.params["resolutionNumber"] ?? pathSuffix;
  if (!rawParam) {
    throw new AppError(400, "BAD_REQUEST", "Thiếu mã số quyết định cần xác thực.");
  }

  let resolutionNumber: string;
  try {
    resolutionNumber = decodeURIComponent(String(rawParam));
  } catch {
    throw new AppError(400, "BAD_REQUEST", "Mã số quyết định không hợp lệ (lỗi mã hóa URL).");
  }

  const result = ExecutiveService.verifyResolutionByNumber(resolutionNumber);

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function exportResolutionPdf(req: Request, res: Response): Promise<void> {
  const resolution = req.body;
  const pdfBytes = await ExecutiveService.exportResolutionPdf(resolution);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="Quyet-Dinh-${encodeURIComponent(resolution.resolutionNumber || "Official")}.pdf"`
  );
  res.status(200).send(Buffer.from(pdfBytes));
}
