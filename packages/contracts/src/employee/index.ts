import { z } from "zod";

export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
export const AcademicTitleEnum = z.enum(["NONE", "ASSOCIATE_PROFESSOR", "PROFESSOR"]);
export const AcademicDegreeEnum = z.enum(["BACHELOR", "MASTER", "DOCTOR"]);
export const EmploymentStatusEnum = z.enum([
  "PROBATION",
  "ACTIVE",
  "ON_LEAVE",
  "RESIGNED",
  "RETIRED",
]);

// Basic Employee DTO (for public & unit listing)
export const EmployeeBasicDtoSchema = z.object({
  id: z.string().uuid(),
  employeeCode: z.string(),
  fullName: z.string(),
  gender: GenderEnum,
  workEmail: z.string().email(),
  phoneNumber: z.string().nullable(),
  academicTitle: AcademicTitleEnum,
  academicDegree: AcademicDegreeEnum,
  employmentStatus: EmploymentStatusEnum,
  hireDate: z.string(),
  primaryUnitName: z.string().nullable().optional(),
  primaryPositionName: z.string().nullable().optional(),
});

export type EmployeeBasicDto = z.infer<typeof EmployeeBasicDtoSchema>;

// Detailed Employee DTO (includes sensitive fields for HR and Self)
export const EmployeeDetailedDtoSchema = EmployeeBasicDtoSchema.extend({
  dateOfBirth: z.string(),
  idCardNumber: z.string().nullable().optional(),
  idCardIssueDate: z.string().nullable().optional(),
  idCardIssuePlace: z.string().nullable().optional(),
  taxCode: z.string().nullable().optional(),
  personalEmail: z.string().nullable().optional(),
  currentAddress: z.string().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
});

export type EmployeeDetailedDto = z.infer<typeof EmployeeDetailedDtoSchema>;

// Create Employee Schema
export const CreateEmployeeSchema = z.object({
  employeeCode: z.string().min(3).max(50).optional(), // Tự động sinh nếu không nhập
  fullName: z.string().min(2, "Họ và tên tối thiểu 2 ký tự"),
  gender: GenderEnum,
  dateOfBirth: z.string(),
  idCardNumber: z.string().min(9, "Số CCCD không hợp lệ").max(20),
  idCardIssueDate: z.string().optional(),
  idCardIssuePlace: z.string().optional(),
  taxCode: z.string().optional(),
  personalEmail: z.string().email().optional(),
  workEmail: z.string().email("Email làm việc không đúng định dạng"),
  phoneNumber: z.string().min(9, "Số điện thoại tối thiểu 9 số").max(15).optional(),
  currentAddress: z.string().optional(),
  academicTitle: AcademicTitleEnum.optional().default("NONE"),
  academicDegree: AcademicDegreeEnum.optional().default("BACHELOR"),
  employmentStatus: EmploymentStatusEnum.optional().default("ACTIVE"),
  hireDate: z.string(),
  // Phân công ban đầu
  initialUnitId: z.string().uuid("Vui lòng chọn đơn vị trực thuộc"),
  initialPositionId: z.string().uuid("Vui lòng chọn chức vụ / chức danh"),
  createUserAccount: z.boolean().optional().default(true),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;

// Self-Service Contact Update Schema (Giảng viên tự sửa)
export const UpdateMyContactSchema = z.object({
  phoneNumber: z.string().min(9).max(15).optional(),
  personalEmail: z.string().email().optional(),
  currentAddress: z.string().max(500).optional(),
});

export type UpdateMyContactInput = z.infer<typeof UpdateMyContactSchema>;

// Filter Query for Employees
export const EmployeeFilterQuerySchema = z.object({
  unitId: z.string().uuid().optional(),
  status: EmploymentStatusEnum.optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type EmployeeFilterQuery = z.infer<typeof EmployeeFilterQuerySchema>;
