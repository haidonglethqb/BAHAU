import { z } from "zod";
export declare const UnitTypeEnum: z.ZodEnum<{
    BOARD: "BOARD";
    CENTER: "CENTER";
    DEPARTMENT: "DEPARTMENT";
    DIVISION: "DIVISION";
    FACULTY: "FACULTY";
}>;
export type UnitType = z.infer<typeof UnitTypeEnum>;
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
export declare const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto>;
export declare const CreateUnitSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    unitType: z.ZodEnum<{
        BOARD: "BOARD";
        CENTER: "CENTER";
        DEPARTMENT: "DEPARTMENT";
        DIVISION: "DIVISION";
        FACULTY: "FACULTY";
    }>;
    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    managerEmployeeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    orderIndex: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
export declare const UpdateUnitSchema: z.ZodObject<{
    code: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    unitType: z.ZodOptional<z.ZodEnum<{
        BOARD: "BOARD";
        CENTER: "CENTER";
        DEPARTMENT: "DEPARTMENT";
        DIVISION: "DIVISION";
        FACULTY: "FACULTY";
    }>>;
    parentId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    managerEmployeeId: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    orderIndex: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodNumber>>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;
//# sourceMappingURL=index.d.ts.map