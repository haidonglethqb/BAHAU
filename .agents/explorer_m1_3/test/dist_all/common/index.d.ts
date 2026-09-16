import { z } from "zod";
export declare const PaginationQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        asc: "asc";
        desc: "desc";
    }>>>;
    search: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export declare const ErrorDetailSchema: z.ZodObject<{
    field: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
}, z.core.$strip>;
export declare const StandardErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
    }, z.core.$strip>>>;
    requestId: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodString;
}, z.core.$strip>;
export type StandardError = z.infer<typeof StandardErrorSchema>;
export declare const SuccessResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: T;
    meta: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const PaginatedResponseSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: z.ZodArray<T>;
    pagination: z.ZodObject<{
        page: z.ZodNumber;
        pageSize: z.ZodNumber;
        totalItems: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNextPage: z.ZodBoolean;
        hasPreviousPage: z.ZodBoolean;
    }, z.core.$strip>;
    meta: z.ZodOptional<z.ZodObject<{
        timestamp: z.ZodString;
        requestId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const FailureResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodOptional<z.ZodString>;
            message: z.ZodString;
        }, z.core.$strip>>>;
        requestId: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
//# sourceMappingURL=index.d.ts.map