import { Request, Response } from "express";
import { RdService } from "../services/rd.service.js";
import {
  CreateRdProjectInputSchema,
  ReviewRdProjectInputSchema,
  AllocateRoyaltyInputSchema,
  ApproveRdWithPkiInputSchema,
  RdProjectFilterQuerySchema,
} from "@bahau/contracts";

export async function getAllRdProjects(req: Request, res: Response): Promise<void> {
  const query = RdProjectFilterQuerySchema.parse(req.query);
  const data = RdService.getAllProjects(query);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getRdProjectById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const data = RdService.getProjectById(id);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function createRdProject(req: Request, res: Response): Promise<void> {
  const input = CreateRdProjectInputSchema.parse(req.body);
  const data = RdService.createProject(input);

  res.status(201).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function reviewRdProjectCouncil(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ReviewRdProjectInputSchema.parse(req.body);
  const data = RdService.submitCouncilReview(id, input);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function allocateRdRoyalty(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = AllocateRoyaltyInputSchema.parse(req.body);
  const data = RdService.allocateRoyalty(id, input);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function approveRdProjectWithPki(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ApproveRdWithPkiInputSchema.parse(req.body);
  const result = RdService.approveAndSignWithPki(id, input);

  res.status(200).json({
    success: true,
    data: result.project,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
      pkiSignature: result.pkiSignature,
      resolutionNumber: result.resolutionNumber,
      signedAt: result.signedAt,
    },
  });
}

export async function downloadRdResolutionPdf(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const pdfBytes = await RdService.exportResolutionPdf(id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Quyet-Dinh-Nghiem-Thu-Nhuoi-But-${id}.pdf"`
  );
  res.setHeader("Content-Length", pdfBytes.byteLength.toString());

  res.status(200).send(Buffer.from(pdfBytes));
}
