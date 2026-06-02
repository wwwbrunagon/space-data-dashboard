/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const createPrismaClient = () => new PrismaClient();

declare global {
	// eslint-disable-next-line no-var
	var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalThis.prisma = prisma;
}
