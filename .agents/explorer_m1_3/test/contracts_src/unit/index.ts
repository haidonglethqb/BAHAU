import { z } from "zod";

export const UnitTypeEnum = z.enum([
  "BOARD",        // Ban Giám hiệu
  "FACULTY",      // Khoa đào tạo
  "DEPARTMENT",   // Phòng ban chức năng
  "DIVISION",     // Bộ môn trực thuộc khoa
  "CENTER",       // Trung tâm/Viện trực thuộc
]);

export type UnitType = z.infer<typeof UnitTypeEnum>;

// Unit DTO
export type OrganizationalUnitDto = {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  parentId: string | null;
  managerEmployeeId: string | null;
  managerName?: string | null;
  isActive: boolean;
  orderIndex: number;
  children?: OrganizationalUnitDto[];
};

export const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto> = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  unitType: UnitTypeEnum,
  parentId: z.string().uuid().nullable(),
  managerEmployeeId: z.string().uuid().nullable(),
  managerName: z.string().nullable().optional(),
  isActive: z.boolean(),
  orderIndex: z.number().int(),
  children: z.array(z.lazy(() => OrganizationalUnitDtoSchema)).optional(),
});

// Create Unit Schema
export const CreateUnitSchema = z.object({
  code: z.string().min(2, "Mã đơn vị tối thiểu 2 ký tự").max(50),
  name: z.string().min(2, "Tên đơn vị tối thiểu 2 ký tự").max(255),
  unitType: UnitTypeEnum,
  parentId: z.string().uuid().nullable().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().optional().default(0),
});

export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;

// Update Unit Schema
export const UpdateUnitSchema = CreateUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;
