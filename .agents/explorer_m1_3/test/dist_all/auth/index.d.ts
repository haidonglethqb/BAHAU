import { z } from "zod";
export declare const LoginRequestSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export declare const AuthUserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    employeeId: z.ZodNullable<z.ZodString>;
    employeeCode: z.ZodNullable<z.ZodString>;
    fullName: z.ZodNullable<z.ZodString>;
    roles: z.ZodArray<z.ZodString>;
    permissions: z.ZodArray<z.ZodString>;
    unitsManaged: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type AuthUser = z.infer<typeof AuthUserSchema>;
export declare const LoginResponseDataSchema: z.ZodObject<{
    user: z.ZodObject<{
        id: z.ZodString;
        email: z.ZodString;
        employeeId: z.ZodNullable<z.ZodString>;
        employeeCode: z.ZodNullable<z.ZodString>;
        fullName: z.ZodNullable<z.ZodString>;
        roles: z.ZodArray<z.ZodString>;
        permissions: z.ZodArray<z.ZodString>;
        unitsManaged: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
    message: z.ZodString;
}, z.core.$strip>;
export type LoginResponseData = z.infer<typeof LoginResponseDataSchema>;
//# sourceMappingURL=index.d.ts.map