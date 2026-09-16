"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeFilterQuerySchema = exports.UpdateMyContactSchema = exports.CreateEmployeeSchema = exports.EmployeeDetailedDtoSchema = exports.EmployeeBasicDtoSchema = exports.EmploymentStatusEnum = exports.AcademicDegreeEnum = exports.AcademicTitleEnum = exports.GenderEnum = void 0;
const zod_1 = require("zod");
exports.GenderEnum = zod_1.z.enum(["MALE", "FEMALE", "OTHER"]);
exports.AcademicTitleEnum = zod_1.z.enum(["NONE", "ASSOCIATE_PROFESSOR", "PROFESSOR"]);
exports.AcademicDegreeEnum = zod_1.z.enum(["BACHELOR", "MASTER", "DOCTOR"]);
exports.EmploymentStatusEnum = zod_1.z.enum([
    "PROBATION",
    "ACTIVE",
    "ON_LEAVE",
    "RESIGNED",
    "RETIRED",
]);
// Basic Employee DTO (for public & unit listing)
exports.EmployeeBasicDtoSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    employeeCode: zod_1.z.string(),
    fullName: zod_1.z.string(),
    gender: exports.GenderEnum,
    workEmail: zod_1.z.string().email(),
    phoneNumber: zod_1.z.string().nullable(),
    academicTitle: exports.AcademicTitleEnum,
    academicDegree: exports.AcademicDegreeEnum,
    employmentStatus: exports.EmploymentStatusEnum,
    hireDate: zod_1.z.string(),
    primaryUnitName: zod_1.z.string().nullable().optional(),
    primaryPositionName: zod_1.z.string().nullable().optional(),
});
// Detailed Employee DTO (includes sensitive fields for HR and Self)
exports.EmployeeDetailedDtoSchema = exports.EmployeeBasicDtoSchema.extend({
    dateOfBirth: zod_1.z.string(),
    idCardNumber: zod_1.z.string().nullable().optional(),
    idCardIssueDate: zod_1.z.string().nullable().optional(),
    idCardIssuePlace: zod_1.z.string().nullable().optional(),
    taxCode: zod_1.z.string().nullable().optional(),
    personalEmail: zod_1.z.string().nullable().optional(),
    currentAddress: zod_1.z.string().nullable().optional(),
    userId: zod_1.z.string().uuid().nullable().optional(),
});
// Create Employee Schema
exports.CreateEmployeeSchema = zod_1.z.object({
    employeeCode: zod_1.z.string().min(3).max(50).optional(), // Tự động sinh nếu không nhập
    fullName: zod_1.z.string().min(2, "Họ và tên tối thiểu 2 ký tự"),
    gender: exports.GenderEnum,
    dateOfBirth: zod_1.z.string(),
    idCardNumber: zod_1.z.string().min(9, "Số CCCD không hợp lệ").max(20),
    idCardIssueDate: zod_1.z.string().optional(),
    idCardIssuePlace: zod_1.z.string().optional(),
    taxCode: zod_1.z.string().optional(),
    personalEmail: zod_1.z.string().email().optional(),
    workEmail: zod_1.z.string().email("Email làm việc không đúng định dạng"),
    phoneNumber: zod_1.z.string().min(9, "Số điện thoại tối thiểu 9 số").max(15).optional(),
    currentAddress: zod_1.z.string().optional(),
    academicTitle: exports.AcademicTitleEnum.optional().default("NONE"),
    academicDegree: exports.AcademicDegreeEnum.optional().default("BACHELOR"),
    employmentStatus: exports.EmploymentStatusEnum.optional().default("ACTIVE"),
    hireDate: zod_1.z.string(),
    // Phân công ban đầu
    initialUnitId: zod_1.z.string().uuid("Vui lòng chọn đơn vị trực thuộc"),
    initialPositionId: zod_1.z.string().uuid("Vui lòng chọn chức vụ / chức danh"),
    createUserAccount: zod_1.z.boolean().optional().default(true),
});
// Self-Service Contact Update Schema (Giảng viên tự sửa)
exports.UpdateMyContactSchema = zod_1.z.object({
    phoneNumber: zod_1.z.string().min(9).max(15).optional(),
    personalEmail: zod_1.z.string().email().optional(),
    currentAddress: zod_1.z.string().max(500).optional(),
});
// Filter Query for Employees
exports.EmployeeFilterQuerySchema = zod_1.z.object({
    unitId: zod_1.z.string().uuid().optional(),
    status: exports.EmploymentStatusEnum.optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=index.js.map