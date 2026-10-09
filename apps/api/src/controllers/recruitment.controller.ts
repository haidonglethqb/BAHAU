import { Request, Response } from "express";
import { RecruitmentService } from "../services/recruitment.service.js";
import {
  CreateCandidateApplicationInputSchema,
  ScoreRound1InputSchema,
  ScoreRound2InputSchema,
  ApproveRecruitmentWithPkiInputSchema,
  RecruitmentFilterQuerySchema,
} from "@bahau/contracts";

export async function getRecruitmentCandidates(req: Request, res: Response): Promise<void> {
  const query = RecruitmentFilterQuerySchema.parse(req.query);
  const data = await RecruitmentService.getAllCandidates(query);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getRecruitmentCandidateById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const data = await RecruitmentService.getCandidateById(id);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function createCandidateApplication(req: Request, res: Response): Promise<void> {
  const input = CreateCandidateApplicationInputSchema.parse(req.body);
  const data = await RecruitmentService.createApplication(input);

  res.status(201).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function scoreCandidateRound1(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ScoreRound1InputSchema.parse(req.body);
  const data = await RecruitmentService.scoreRound1(id, input, req.user);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function scoreCandidateRound2(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ScoreRound2InputSchema.parse(req.body);
  const data = await RecruitmentService.scoreRound2(id, input, req.user);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function appointRecruitmentWithPki(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ApproveRecruitmentWithPkiInputSchema.parse(req.body);
  const data = await RecruitmentService.appointWithPki(id, input, req.user);

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
  const pdfBytes = await RecruitmentService.exportAppointmentPdf(id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Quyet-dinh-tuyen-dung-${id}.pdf"`
  );
  res.send(Buffer.from(pdfBytes));
}
