import { Request, Response } from "express";
import { ContractService } from "../services/contract.service.js";

export async function getContracts(req: Request, res: Response): Promise<void> {
  const result = await ContractService.getContracts(req.query as any, req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result.items,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      pagination: result.pagination,
    },
  });
}

export async function getContractAlertSummary(req: Request, res: Response): Promise<void> {
  const summary = await ContractService.getContractAlertSummary(req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: summary,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getContractById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const detail = await ContractService.getContractById(id, req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: detail,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createContract(req: Request, res: Response): Promise<void> {
  const created = await ContractService.createContract(req.body, req.user);
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

export async function renewContract(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const renewed = await ContractService.renewContract(id, req.body, req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: renewed,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
