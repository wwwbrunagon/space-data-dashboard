/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const createPrismaClient = () => {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error(
			'DATABASE_URL is not defined. Set DATABASE_URL in your environment before starting the app.',
		);
	}

	return new PrismaClient();
};

declare global {
	// eslint-disable-next-line no-var
	var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
	globalThis.prisma = prisma;
}
