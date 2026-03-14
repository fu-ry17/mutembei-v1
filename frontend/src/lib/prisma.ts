import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { paginate } from "prisma-extension-pagination";

const globalForPrisma = global as unknown as {
  prisma: ReturnType<typeof createPrismaClient>;
};

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter }).$extends({
    model: {
      $allModels: {
        paginate,
      },
    },
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
