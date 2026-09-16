import { z } from "zod";

// Login Request
export const LoginRequestSchema = z.object({
  email: z.string().email("Email không đúng định dạng"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// Authenticated User Profile DTO
export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  employeeId: z.string().uuid().nullable(),
  employeeCode: z.string().nullable(),
  fullName: z.string().nullable(),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  unitsManaged: z.array(z.string()), // Danh sách các unitId mà user làm lãnh đạo
});

export type AuthUser = z.infer<typeof AuthUserSchema>;

// Login Response
export const LoginResponseDataSchema = z.object({
  user: AuthUserSchema,
  message: z.string(),
});

export type LoginResponseData = z.infer<typeof LoginResponseDataSchema>;
