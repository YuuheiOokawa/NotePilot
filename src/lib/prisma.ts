import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Neonサーバーレスドライバ経由で接続する（WebSocket/443ポート）。
// 直接5432に繋ぐ方式と違い、プロキシ環境でもNODE_EXTRA_CA_CERTSで通せる。
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaNeon(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
