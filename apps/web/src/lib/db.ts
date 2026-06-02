import { prisma } from 'db';
import type { PrismaClient } from 'db';

export const db: PrismaClient = prisma;
