import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis;
export const prisma = globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.PRISMA_LOG === "true" ? ["query", "error", "warn"] : ["error"]
    });
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
