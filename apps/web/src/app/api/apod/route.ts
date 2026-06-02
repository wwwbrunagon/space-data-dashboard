import { NextRequest, NextResponse } from 'next/server';
import { fetchApod } from '@/lib/nasa';
import { getCachedApod, upsertApodSnapshot } from '@/lib/space';

function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
	const date = req.nextUrl.searchParams.get('date');
	if (date && !isValidDate(date)) {
		return NextResponse.json(
			{ error: 'Invalid date format. Use YYYY-MM-DD.' },
			{ status: 400 },
		);
	}

	try {
		const cached = await getCachedApod(date ?? undefined);
		if (cached) {
			return NextResponse.json(
				{ ...cached, source: 'db' },
				{
					headers: { 'X-Cache': 'HIT' },
				},
			);
		}

		const apod = await fetchApod(date ?? undefined);
		await upsertApodSnapshot(apod);
		return NextResponse.json(
			{ ...apod, source: 'api' },
			{
				headers: { 'X-Cache': 'MISS' },
			},
		);
	} catch (error) {
		console.error('[APOD API]', error);
		return NextResponse.json(
			{ error: 'Failed to retrieve APOD data.' },
			{ status: 502 },
		);
	}
}
