import "@/lib/db-env-shim";
import { PrismaClient } from "@prisma/client";
import {
  isPrismaReadOperation,
  withPrismaRetry,
} from "@/lib/prisma-unreachable";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient();
  return client.$extends({
    query: {
      async $allOperations({ operation, args, query }) {
        if (!isPrismaReadOperation(operation)) {
          return query(args);
        }
        return withPrismaRetry(() => query(args));
      },
    },
  }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
