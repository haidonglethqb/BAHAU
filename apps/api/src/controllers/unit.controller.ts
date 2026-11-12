import { Request, Response } from "express";
import { z } from "zod";
import { UnitService } from "../services/unit.service.js";
import { AppError } from "../middlewares/error.middleware.js";

const uuidParamSchema = z.string().uuid();

function parseUnitIdParam(rawId: unknown): string {
  const parsed = uuidParamSchema.safeParse(rawId);
  if (!parsed.success) {
    throw new AppError(400, "BAD_REQUEST", "Mã định danh đơn vị (UUID) không hợp lệ.");
  }
  return parsed.data;
}

export async function getUnitTree(req: Request, res: Response): Promise<void> {
  const tree = await UnitService.getUnitTree();
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: tree,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getAllUnits(req: Request, res: Response): Promise<void> {
  const units = await UnitService.getAllUnits();
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: units,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createUnit(req: Request, res: Response): Promise<void> {
  const unit = await UnitService.createUnit(req.body);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: unit,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function updateUnit(req: Request, res: Response): Promise<void> {
  const id = parseUnitIdParam(req.params["id"]);
  const unit = await UnitService.updateUnit(id, req.body);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: unit,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function deleteUnit(req: Request, res: Response): Promise<void> {
  const id = parseUnitIdParam(req.params["id"]);
  const unit = await UnitService.deleteUnit(id);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: unit,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
