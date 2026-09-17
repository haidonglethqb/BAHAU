import { Request, Response } from "express";
import { UnitService } from "../services/unit.service.js";

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
