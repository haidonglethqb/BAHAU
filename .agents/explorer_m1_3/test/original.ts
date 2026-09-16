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
export const OrganizationalUnitDtoSchema = z.object({
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

export type OrganizationalUnitDto = z.infer<typeof OrganizationalUnitDtoSchema>;
