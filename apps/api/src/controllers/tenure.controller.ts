import { Request, Response } from "express";
import { TenureService } from "../services/tenure.service.js";
import {
  CreateTenureApplicationInputSchema,
  TenureCouncilVoteInputSchema,
  AppointTenureWithPkiInputSchema,
  TenureFilterQuerySchema,
} from "@bahau/contracts";

export async function getTenureApplications(req: Request, res: Response): Promise<void> {
  const query = TenureFilterQuerySchema.parse(req.query);
  const data = await TenureService.getAllApplications(query);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getTenureApplicationById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const data = await TenureService.getApplicationById(id);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function createTenureApplication(req: Request, res: Response): Promise<void> {
  const input = CreateTenureApplicationInputSchema.parse(req.body);
  const data = await TenureService.createApplication(input, req.user);

  res.status(201).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function recordTenureCouncilVote(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = TenureCouncilVoteInputSchema.parse(req.body);
  const data = await TenureService.recordTenureCouncilVote(id, input, req.user);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function appointTenureWithPki(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = AppointTenureWithPkiInputSchema.parse(req.body);
  const data = await TenureService.appointWithPki(id, input, req.user);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function downloadAppointmentResolutionPdf(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const pdfBytes = await TenureService.exportAppointmentResolutionPdf(id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Quyet-dinh-bo-nhiem-${id}.pdf"`
  );
  res.send(Buffer.from(pdfBytes));
}
