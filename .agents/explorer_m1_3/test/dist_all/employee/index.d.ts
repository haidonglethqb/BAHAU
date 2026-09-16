import { z } from "zod";
export declare const GenderEnum: z.ZodEnum<{
    FEMALE: "FEMALE";
    MALE: "MALE";
    OTHER: "OTHER";
}>;
export declare const AcademicTitleEnum: z.ZodEnum<{
    ASSOCIATE_PROFESSOR: "ASSOCIATE_PROFESSOR";
    NONE: "NONE";
    PROFESSOR: "PROFESSOR";
}>;
export declare const AcademicDegreeEnum: z.ZodEnum<{
    BACHELOR: "BACHELOR";
    DOCTOR: "DOCTOR";
    MASTER: "MASTER";
}>;
export declare const EmploymentStatusEnum: z.ZodEnum<{
    ACTIVE: "ACTIVE";
    ON_LEAVE: "ON_LEAVE";
    PROBATION: "PROBATION";
    RESIGNED: "RESIGNED";
    RETIRED: "RETIRED";
}>;
export declare const EmployeeBasicDtoSchema: z.ZodObject<{
    id: z.ZodString;
    employeeCode: z.ZodString;
    fullName: z.ZodString;
    gender: z.ZodEnum<{
        FEMALE: "FEMALE";
        MALE: "MALE";
        OTHER: "OTHER";
    }>;
    workEmail: z.ZodString;
    phoneNumber: z.ZodNullable<z.ZodString>;
    academicTitle: z.ZodEnum<{
        ASSOCIATE_PROFESSOR: "ASSOCIATE_PROFESSOR";
        NONE: "NONE";
        PROFESSOR: "PROFESSOR";
    }>;
    academicDegree: z.ZodEnum<{
        BACHELOR: "BACHELOR";
        DOCTOR: "DOCTOR";
        MASTER: "MASTER";
    }>;
    employmentStatus: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        ON_LEAVE: "ON_LEAVE";
        PROBATION: "PROBATION";
        RESIGNED: "RESIGNED";
        RETIRED: "RETIRED";
    }>;
    hireDate: z.ZodString;
    primaryUnitName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    primaryPositionName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type EmployeeBasicDto = z.infer<typeof EmployeeBasicDtoSchema>;
export declare const EmployeeDetailedDtoSchema: z.ZodObject<{
    id: z.ZodString;
    employeeCode: z.ZodString;
    fullName: z.ZodString;
    gender: z.ZodEnum<{
        FEMALE: "FEMALE";
        MALE: "MALE";
        OTHER: "OTHER";
    }>;
    workEmail: z.ZodString;
    phoneNumber: z.ZodNullable<z.ZodString>;
    academicTitle: z.ZodEnum<{
        ASSOCIATE_PROFESSOR: "ASSOCIATE_PROFESSOR";
        NONE: "NONE";
        PROFESSOR: "PROFESSOR";
    }>;
    academicDegree: z.ZodEnum<{
        BACHELOR: "BACHELOR";
        DOCTOR: "DOCTOR";
        MASTER: "MASTER";
    }>;
    employmentStatus: z.ZodEnum<{
        ACTIVE: "ACTIVE";
        ON_LEAVE: "ON_LEAVE";
        PROBATION: "PROBATION";
        RESIGNED: "RESIGNED";
        RETIRED: "RETIRED";
    }>;
    hireDate: z.ZodString;
    primaryUnitName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    primaryPositionName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    dateOfBirth: z.ZodString;
    idCardNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    idCardIssueDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    idCardIssuePlace: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    taxCode: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    personalEmail: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    currentAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    userId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export type EmployeeDetailedDto = z.infer<typeof EmployeeDetailedDtoSchema>;
export declare const CreateEmployeeSchema: z.ZodObject<{
    employeeCode: z.ZodOptional<z.ZodString>;
    fullName: z.ZodString;
    gender: z.ZodEnum<{
        FEMALE: "FEMALE";
        MALE: "MALE";
        OTHER: "OTHER";
    }>;
    dateOfBirth: z.ZodString;
    idCardNumber: z.ZodString;
    idCardIssueDate: z.ZodOptional<z.ZodString>;
    idCardIssuePlace: z.ZodOptional<z.ZodString>;
    taxCode: z.ZodOptional<z.ZodString>;
    personalEmail: z.ZodOptional<z.ZodString>;
    workEmail: z.ZodString;
    phoneNumber: z.ZodOptional<z.ZodString>;
    currentAddress: z.ZodOptional<z.ZodString>;
    academicTitle: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ASSOCIATE_PROFESSOR: "ASSOCIATE_PROFESSOR";
        NONE: "NONE";
        PROFESSOR: "PROFESSOR";
    }>>>;
    academicDegree: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        BACHELOR: "BACHELOR";
        DOCTOR: "DOCTOR";
        MASTER: "MASTER";
    }>>>;
    employmentStatus: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        ON_LEAVE: "ON_LEAVE";
        PROBATION: "PROBATION";
        RESIGNED: "RESIGNED";
        RETIRED: "RETIRED";
    }>>>;
    hireDate: z.ZodString;
    initialUnitId: z.ZodString;
    initialPositionId: z.ZodString;
    createUserAccount: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export declare const UpdateMyContactSchema: z.ZodObject<{
    phoneNumber: z.ZodOptional<z.ZodString>;
    personalEmail: z.ZodOptional<z.ZodString>;
    currentAddress: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type UpdateMyContactInput = z.infer<typeof UpdateMyContactSchema>;
export declare const EmployeeFilterQuerySchema: z.ZodObject<{
    unitId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<{
        ACTIVE: "ACTIVE";
        ON_LEAVE: "ON_LEAVE";
        PROBATION: "PROBATION";
        RESIGNED: "RESIGNED";
        RETIRED: "RETIRED";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export type EmployeeFilterQuery = z.infer<typeof EmployeeFilterQuerySchema>;
//# sourceMappingURL=index.d.ts.map