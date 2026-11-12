import { Request, Response } from "express";
import { TrainingService } from "../services/training.service.js";
import {
  CreateCertificateInput,
  VerifyCertificateInput,
  CreateTrainingCourseInput,
  RegisterTrainingCourseInput,
  UpdateParticipantStatusInput,
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
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để tra cứu chứng chỉ.");
  }

  const query: CertificateFilterQuery = req.query as any;
  const certs = await TrainingService.getAllCertificates(query, req.user);
  res.json({
    success: true,
    data: certs,
  });
}

export async function verifyCertificate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để thực hiện thẩm định");
  }
  if (!req.user.roles.includes("ROLE_HR_OFFICER")) {
    throw new AppError(403, "FORBIDDEN", "Chỉ cán bộ Phòng Tổ chức - Hành chính mới được phép thẩm định chứng chỉ.");
  }
  const verifierEmployeeId = req.user.employeeId;
  if (!verifierEmployeeId) {
    throw new AppError(403, "FORBIDDEN", "Tài khoản chưa được liên kết hồ sơ nhân sự để thực hiện thẩm định");
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
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để tra cứu chứng chỉ sắp hết hạn.");
  }

  const rawDays = req.query.days;
  const days = rawDays !== undefined && rawDays !== "" ? Number(rawDays) : 90;
  if (!Number.isFinite(days) || days < 0 || days > 3650) {
    throw new AppError(422, "VALIDATION_FAILED", "Tham số days phải nằm trong khoảng 0 đến 3650.");
  }

  const certs = await TrainingService.getExpiringCertificates(days, req.user);
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

export async function updateCourseStatus(req: Request, res: Response): Promise<void> {
  const id = String(req.params.id);
  const status = req.body.status as "PLANNING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  const course = await TrainingService.updateCourseStatus(id, status);
  res.json({
    success: true,
    data: course,
  });
}

export async function updateParticipantStatus(req: Request, res: Response): Promise<void> {
  const courseId = String(req.params.courseId);
  const employeeId = String(req.params.employeeId);
  const input: UpdateParticipantStatusInput = req.body;
  const participant = await TrainingService.updateParticipantStatus(courseId, employeeId, input);
  res.json({
    success: true,
    data: participant,
  });
}
