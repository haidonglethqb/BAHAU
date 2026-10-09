import { Request, Response } from "express";
import { PostgradService } from "../services/postgrad.service.js";
import {
  CreatePostgradStudentInputSchema,
  ScheduleDefenseCouncilInputSchema,
  ScoreThesisDefenseInputSchema,
  AwardPostgradDegreeWithPkiInputSchema,
  PostgradFilterQuerySchema,
} from "@bahau/contracts";

export async function getAllPostgradStudents(req: Request, res: Response): Promise<void> {
  const query = PostgradFilterQuerySchema.parse(req.query);
  const data = PostgradService.getAllStudents(query);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getPostgradStudentById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const data = PostgradService.getStudentById(id);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function createPostgradStudent(req: Request, res: Response): Promise<void> {
  const input = CreatePostgradStudentInputSchema.parse(req.body);
  const data = PostgradService.createStudent(input);

  res.status(201).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function schedulePostgradDefenseCouncil(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ScheduleDefenseCouncilInputSchema.parse(req.body);
  const data = PostgradService.scheduleDefenseCouncil(id, input);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function scorePostgradThesisDefense(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = ScoreThesisDefenseInputSchema.parse(req.body);
  const data = PostgradService.scoreThesisDefense(id, input);

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function awardPostgradDegreeWithPki(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const input = AwardPostgradDegreeWithPkiInputSchema.parse(req.body);
  const result = PostgradService.awardDegreeWithPki(id, input);

  res.status(200).json({
    success: true,
    data: result.student,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
      pkiSignature: result.pkiSignature,
      resolutionNumber: result.resolutionNumber,
      signedAt: result.signedAt,
    },
  });
}

export async function downloadDegreeResolutionPdf(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const pdfBytes = await PostgradService.exportDegreeResolutionPdf(id);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Quyet-Dinh-Cap-Bang-Sau-Dai-Hoc-${id}.pdf"`
  );
  res.setHeader("Content-Length", pdfBytes.byteLength.toString());

  res.status(200).send(Buffer.from(pdfBytes));
}
