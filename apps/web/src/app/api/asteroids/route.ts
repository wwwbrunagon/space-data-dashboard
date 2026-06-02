import { NextRequest, NextResponse } from 'next/server';
import { fetchNeoFeed } from '@/lib/nasa';
import {
	getAsteroidsByRange,
	isValidDate,
	syncAsteroidFeed,
} from '@/lib/space';

function isDateRangeValid(start: string, end: string) {
	return (
		isValidDate(start) && isValidDate(end) && new Date(start) <= new Date(end)
	);
}

function isRangeTooLarge(start: string, end: string) {
	const startDate = new Date(start);
	const endDate = new Date(end);
	return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) > 7;
}

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const start =
		searchParams.get('start') ?? new Date().toISOString().slice(0, 10);
	const end =
		searchParams.get('end') ??
		new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

	if (!isDateRangeValid(start, end)) {
		return NextResponse.json(
			{
				error:
					'Invalid start/end date range. Use YYYY-MM-DD and ensure start <= end.',
			},
			{ status: 400 },
		);
	}

	if (isRangeTooLarge(start, end)) {
		return NextResponse.json(
			{ error: 'Date range may not exceed 7 days.' },
			{ status: 400 },
		);
	}

	try {
		const cached = await getAsteroidsByRange(start, end);
		if (cached.length > 0) {
			return NextResponse.json(
				{ asteroids: cached, source: 'db', start, end },
				{
					headers: { 'X-Cache': 'HIT' },
				},
			);
		}

		const feed = await fetchNeoFeed(start, end);
		const syncedCount = await syncAsteroidFeed(feed);
		const fresh = await getAsteroidsByRange(start, end);
		return NextResponse.json(
			{ asteroids: fresh, source: 'api', count: syncedCount, start, end },
			{ headers: { 'X-Cache': 'MISS' } },
		);
	} catch (error) {
		console.error('[ASTEROIDS API]', error);
		return NextResponse.json(
			{ error: 'Failed to retrieve asteroid data.' },
			{ status: 502 },
		);
	}
}
