import { PrismaClient } from "@prisma/client";

if (!process.env["DATABASE_URL"]) {
  process.env["DATABASE_URL"] =
    "postgresql://bahau_admin:bahau_secret_password_2026@localhost:5433/bahau_hrms?schema=public";
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
