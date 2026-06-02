import { cache } from 'react';
import { ApodSchema, type Apod } from '@/types/nasa';

const NASA_BASE = 'https://api.nasa.gov';

function getApiKey() {
	const key = process.env.NASA_API_KEY;
	if (!key) {
		throw new Error('NASA_API_KEY is not defined in environment variables.');
	}
	return key;
}

async function nasaFetch<T>(
	path: string,
	params: Record<string, string>,
	schema: { parse(data: unknown): T },
): Promise<T> {
	const url = new URL(`${NASA_BASE}${path}`);
	url.searchParams.set('api_key', getApiKey());
	Object.entries(params).forEach(([key, value]) =>
		url.searchParams.set(key, value),
	);

	const res = await fetch(url.toString(), {
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		throw new Error(`NASA API error: ${res.status} ${res.statusText}`);
	}

	const json = await res.json();
	return schema.parse(json);
}

export const fetchApod = cache(async (date?: string): Promise<Apod> => {
	const params: Record<string, string> = date ? { date } : {};
	return nasaFetch('/planetary/apod', params, ApodSchema);
});
