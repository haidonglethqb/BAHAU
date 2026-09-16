"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateUnitSchema = exports.CreateUnitSchema = exports.OrganizationalUnitDtoSchema = exports.UnitTypeEnum = void 0;
const zod_1 = require("zod");
exports.UnitTypeEnum = zod_1.z.enum([
    "BOARD", // Ban Giám hiệu
    "FACULTY", // Khoa đào tạo
    "DEPARTMENT", // Phòng ban chức năng
    "DIVISION", // Bộ môn trực thuộc khoa
    "CENTER", // Trung tâm/Viện trực thuộc
]);
exports.OrganizationalUnitDtoSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    code: zod_1.z.string().min(2).max(50),
    name: zod_1.z.string().min(2).max(255),
    unitType: exports.UnitTypeEnum,
    parentId: zod_1.z.string().uuid().nullable(),
    managerEmployeeId: zod_1.z.string().uuid().nullable(),
    managerName: zod_1.z.string().nullable().optional(),
    isActive: zod_1.z.boolean(),
    orderIndex: zod_1.z.number().int(),
    children: zod_1.z.array(zod_1.z.lazy(() => exports.OrganizationalUnitDtoSchema)).optional(),
});
// Create Unit Schema
exports.CreateUnitSchema = zod_1.z.object({
    code: zod_1.z.string().min(2, "Mã đơn vị tối thiểu 2 ký tự").max(50),
    name: zod_1.z.string().min(2, "Tên đơn vị tối thiểu 2 ký tự").max(255),
    unitType: exports.UnitTypeEnum,
    parentId: zod_1.z.string().uuid().nullable().optional(),
    managerEmployeeId: zod_1.z.string().uuid().nullable().optional(),
    orderIndex: zod_1.z.number().int().optional().default(0),
});
// Update Unit Schema
exports.UpdateUnitSchema = exports.CreateUnitSchema.partial().extend({
    isActive: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=index.js.map