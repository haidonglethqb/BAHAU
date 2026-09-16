"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginResponseDataSchema = exports.AuthUserSchema = exports.LoginRequestSchema = void 0;
const zod_1 = require("zod");
// Login Request
exports.LoginRequestSchema = zod_1.z.object({
    email: zod_1.z.string().email("Email không đúng định dạng"),
    password: zod_1.z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});
// Authenticated User Profile DTO
exports.AuthUserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    employeeId: zod_1.z.string().uuid().nullable(),
    employeeCode: zod_1.z.string().nullable(),
    fullName: zod_1.z.string().nullable(),
    roles: zod_1.z.array(zod_1.z.string()),
    permissions: zod_1.z.array(zod_1.z.string()),
    unitsManaged: zod_1.z.array(zod_1.z.string()), // Danh sách các unitId mà user làm lãnh đạo
});
// Login Response
exports.LoginResponseDataSchema = zod_1.z.object({
    user: exports.AuthUserSchema,
    message: zod_1.z.string(),
});
//# sourceMappingURL=index.js.map