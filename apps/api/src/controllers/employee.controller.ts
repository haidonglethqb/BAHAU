import { Request, Response } from "express";
import { EmployeeService } from "../services/employee.service.js";

export async function getEmployees(req: Request, res: Response): Promise<void> {
  const result = await EmployeeService.getEmployees(req.query as any, req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getEmployeeById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const employee = await EmployeeService.getEmployeeById(id, req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: employee,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getMyProfile(req: Request, res: Response): Promise<void> {
  const profile = await EmployeeService.getMyProfile(req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: profile,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function updateMyContact(req: Request, res: Response): Promise<void> {
  const updated = await EmployeeService.updateMyContact(req.user!, req.body);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: updated,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createEmployee(req: Request, res: Response): Promise<void> {
  const employee = await EmployeeService.createEmployee(req.body);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: employee,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
