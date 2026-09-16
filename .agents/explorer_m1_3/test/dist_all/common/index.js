"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureResponseSchema = exports.PaginatedResponseSchema = exports.SuccessResponseSchema = exports.StandardErrorSchema = exports.ErrorDetailSchema = exports.PaginationQuerySchema = void 0;
const zod_1 = require("zod");
// Pagination Query Schema
exports.PaginationQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional().default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
    search: zod_1.z.string().optional(),
});
// Standard Error Response Schema
exports.ErrorDetailSchema = zod_1.z.object({
    field: zod_1.z.string().optional(),
    message: zod_1.z.string(),
});
exports.StandardErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.array(exports.ErrorDetailSchema).optional(),
    requestId: zod_1.z.string().optional(),
    timestamp: zod_1.z.string(),
});
// Standard Response Envelopes
const SuccessResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: dataSchema,
    meta: zod_1.z
        .object({
        timestamp: zod_1.z.string(),
        requestId: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.SuccessResponseSchema = SuccessResponseSchema;
const PaginatedResponseSchema = (itemSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: zod_1.z.array(itemSchema),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int(),
        pageSize: zod_1.z.number().int(),
        totalItems: zod_1.z.number().int(),
        totalPages: zod_1.z.number().int(),
        hasNextPage: zod_1.z.boolean(),
        hasPreviousPage: zod_1.z.boolean(),
    }),
    meta: zod_1.z
        .object({
        timestamp: zod_1.z.string(),
        requestId: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.PaginatedResponseSchema = PaginatedResponseSchema;
exports.FailureResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: exports.StandardErrorSchema,
});
//# sourceMappingURL=index.js.map