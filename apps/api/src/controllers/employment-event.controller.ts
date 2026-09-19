import { Request, Response } from "express";
import { EmploymentEventService } from "../services/employment-event.service.js";

export async function getEmployeeEvents(req: Request, res: Response): Promise<void> {
  const employeeId = String(req.params["id"]);
  const events = await EmploymentEventService.getEmployeeEvents(employeeId, req.user);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: events,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createEmploymentEvent(req: Request, res: Response): Promise<void> {
  const created = await EmploymentEventService.createEmploymentEvent(req.body, req.user);
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
