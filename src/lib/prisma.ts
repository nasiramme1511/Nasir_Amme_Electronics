import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const base = new PrismaClient({
    log: ['error'],
  });

  return base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let attempts = 0;
          while (attempts < 3) {
            try {
              attempts++;
              return await query(args);
            } catch (err: any) {
              const isConnectionError =
                err?.code === 'P1017' ||
                err?.code === 'P1001' ||
                err?.code === 'P1008' ||
                err?.message?.includes('Connection reset') ||
                err?.message?.includes('Closed the connection') ||
                err?.message?.includes('connection pool') ||
                err?.message?.includes("Can't reach database server");

              if (isConnectionError && attempts < 3) {
                console.warn(`[Prisma] Connection blip (${err.code || 'Reset'}). Retrying query (${attempts}/3)...`);
                await new Promise((r) => setTimeout(r, 350 * attempts));
                continue;
              }
              throw err;
            }
          }
        },
      },
    },
  });
}

export type ExtendedPrismaClient = PrismaClient;

export const prisma =
  globalForPrisma.prisma ??
  (createPrismaClient() as unknown as PrismaClient);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

