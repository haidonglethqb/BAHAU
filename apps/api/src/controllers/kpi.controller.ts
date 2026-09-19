import { Request, Response } from "express";
import { KpiService } from "../services/kpi.service.js";

export async function getPeriods(req: Request, res: Response): Promise<void> {
  const data = await KpiService.getPeriods();
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createPeriod(req: Request, res: Response): Promise<void> {
  const created = await KpiService.createPeriod(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: created,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getTemplates(req: Request, res: Response): Promise<void> {
  const targetType = req.query["targetType"] ? String(req.query["targetType"]) as any : undefined;
  const data = await KpiService.getTemplates(targetType);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getMyEvaluation(req: Request, res: Response): Promise<void> {
  const periodId = req.query["periodId"] ? String(req.query["periodId"]) : undefined;
  const data = await KpiService.getMyEvaluation(periodId, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function submitSelfEvaluation(req: Request, res: Response): Promise<void> {
  const periodId = String(req.query["periodId"] || req.body["periodId"]);
  const data = await KpiService.submitSelfEvaluation(periodId, req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getUnitEvaluations(req: Request, res: Response): Promise<void> {
  const data = await KpiService.getUnitEvaluations(req.query as any, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function scoreManagerEvaluation(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const data = await KpiService.scoreManagerEvaluation(id, req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function finalizeEvaluation(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const data = await KpiService.finalizeEvaluation(id, req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
