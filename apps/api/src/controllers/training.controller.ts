import { Request, Response } from "express";
import { TrainingService } from "../services/training.service.js";
import {
  CreateCertificateInput,
  VerifyCertificateInput,
  CreateTrainingCourseInput,
  RegisterTrainingCourseInput,
  CertificateFilterQuery,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";

export async function getMyCertificates(req: Request, res: Response): Promise<void> {
  const employeeId = (req as any).user?.employeeId;
  if (!employeeId) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập và liên kết hồ sơ nhân sự");
  }

  const certs = await TrainingService.getMyCertificates(employeeId);
  res.json({
    success: true,
    data: certs,
  });
}

export async function submitCertificate(req: Request, res: Response): Promise<void> {
  const employeeId = (req as any).user?.employeeId;
  if (!employeeId) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập và liên kết hồ sơ nhân sự");
  }

  const input: CreateCertificateInput = req.body;
  const created = await TrainingService.submitCertificate(employeeId, input);
  res.status(201).json({
    success: true,
    data: created,
  });
}

export async function getAllCertificates(req: Request, res: Response): Promise<void> {
  const query: CertificateFilterQuery = req.query as any;
  const scopeUnitId = (req as any).user?.scopeUnitId;

  const certs = await TrainingService.getAllCertificates(query, scopeUnitId);
  res.json({
    success: true,
    data: certs,
  });
}

export async function verifyCertificate(req: Request, res: Response): Promise<void> {
  const verifierEmployeeId = (req as any).user?.employeeId;
  if (!verifierEmployeeId) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để thực hiện thẩm định");
  }

  const id = String(req.params.id);
  const input: VerifyCertificateInput = req.body;

  const updated = await TrainingService.verifyCertificate(id, verifierEmployeeId, input);
  res.json({
    success: true,
    data: updated,
  });
}

export async function getExpiringCertificates(req: Request, res: Response): Promise<void> {
  const days = req.query.days ? Number(req.query.days) : 90;
  const scopeUnitId = (req as any).user?.scopeUnitId;

  const certs = await TrainingService.getExpiringCertificates(days, scopeUnitId);
  res.json({
    success: true,
    data: certs,
  });
}

export async function getCourses(req: Request, res: Response): Promise<void> {
  const currentEmployeeId = (req as any).user?.employeeId;
  const courses = await TrainingService.getCourses(currentEmployeeId);
  res.json({
    success: true,
    data: courses,
  });
}

export async function createCourse(req: Request, res: Response): Promise<void> {
  const input: CreateTrainingCourseInput = req.body;
  const course = await TrainingService.createCourse(input);
  res.status(201).json({
    success: true,
    data: course,
  });
}

export async function registerCourse(req: Request, res: Response): Promise<void> {
  const employeeId = (req as any).user?.employeeId;
  if (!employeeId) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập và liên kết hồ sơ nhân sự");
  }

  const id = String(req.params.id);
  const input: RegisterTrainingCourseInput = req.body;

  const participant = await TrainingService.registerCourse(id, employeeId, input);
  res.status(201).json({
    success: true,
    data: participant,
  });
}
