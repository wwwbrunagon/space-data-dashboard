import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncDailyCache } from '@/lib/space';

export async function POST(req: NextRequest) {
	const authorization = req.headers.get('authorization');
	const expected = `Bearer ${process.env.CRON_SECRET}`;

	if (!authorization || authorization !== expected) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const startTime = Date.now();

	try {
		const result = await syncDailyCache();
		await db.syncLog.create({
			data: {
				syncType: 'daily',
				status: 'success',
				details: {
					startDate: result.startDate,
					endDate: result.endDate,
					elementCount: result.elementCount,
				},
				durationMs: Date.now() - startTime,
			},
		});

		return NextResponse.json({
			message: 'Sync completed successfully.',
			result,
		});
	} catch (error) {
		console.error('[CRON SYNC]', error);
		await db.syncLog.create({
			data: {
				syncType: 'daily',
				status: 'error',
				errorMessage: error instanceof Error ? error.message : String(error),
				details: {},
				durationMs: Date.now() - startTime,
			},
		});
		return NextResponse.json(
			{ error: 'Failed to complete cron sync.' },
			{ status: 500 },
		);
	}
}
