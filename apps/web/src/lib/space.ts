import { addDays, format, parseISO } from 'date-fns';
import { db } from './db';
import { fetchApod, fetchNeoFeed } from '@/lib/nasa';
import { type Apod, type NeoFeed, type NeoObject } from '@/types/nasa';

const ISO_DATE_FORMAT = 'yyyy-MM-dd';

export function isValidDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function formatIsoDate(date: Date | string) {
	return format(
		typeof date === 'string' ? parseISO(date) : date,
		ISO_DATE_FORMAT,
	);
}

export function getToday() {
	return formatIsoDate(new Date());
}

export async function getCachedApod(date?: string) {
	const targetDate = date ?? getToday();
	return db.apodSnapshot.findUnique({
		where: { date: targetDate },
	});
}

export async function upsertApodSnapshot(apod: Apod) {
	return db.apodSnapshot.upsert({
		where: { date: apod.date },
		create: {
			date: apod.date,
			title: apod.title,
			explanation: apod.explanation,
			url: apod.url,
			hdurl: apod.hdurl,
			mediaType: apod.media_type,
			serviceVersion: apod.service_version,
			copyright: apod.copyright,
			raw: apod,
		},
		update: {
			title: apod.title,
			explanation: apod.explanation,
			url: apod.url,
			hdurl: apod.hdurl,
			mediaType: apod.media_type,
			serviceVersion: apod.service_version,
			copyright: apod.copyright,
			raw: apod,
		},
	});
}

export async function getAsteroidsByRange(startDate: string, endDate: string) {
	const start = parseISO(startDate);
	const end = parseISO(endDate);
	return db.asteroid.findMany({
		where: {
			closeApproachDate: {
				gte: start,
				lte: end,
			},
		},
		orderBy: { closeApproachDate: 'asc' },
	});
}

function normalizeFeedAsteroids(feed: NeoFeed) {
	const rows: Array<{
		neoReferenceId: string;
		name: string;
		nasaJplUrl: string;
		isPotentiallyHazardous: boolean;
		absoluteMagnitude: number;
		estimatedDiameter: NonNullable<NeoObject['estimated_diameter']>;
		closeApproachDate: Date;
		relativeVelocity: NeoObject['close_approach_data'][number]['relative_velocity'];
		missDistance: NeoObject['close_approach_data'][number]['miss_distance'];
		orbitingBody: string;
		raw: NeoObject;
	}> = [];

	for (const neos of Object.values(feed.near_earth_objects)) {
		for (const neo of neos) {
			for (const approach of neo.close_approach_data) {
				rows.push({
					neoReferenceId: neo.neo_reference_id,
					name: neo.name,
					nasaJplUrl: neo.nasa_jpl_url,
					isPotentiallyHazardous: neo.is_potentially_hazardous_asteroid,
					absoluteMagnitude: neo.absolute_magnitude_h,
					estimatedDiameter: neo.estimated_diameter,
					closeApproachDate: parseISO(approach.close_approach_date),
					relativeVelocity: approach.relative_velocity,
					missDistance: approach.miss_distance,
					orbitingBody: approach.orbiting_body,
					raw: neo,
				});
			}
		}
	}

	return rows;
}

export async function syncAsteroidFeed(feed: NeoFeed) {
	const rows = normalizeFeedAsteroids(feed);
	const upserts = rows.map((asteroid) =>
		db.asteroid.upsert({
			where: {
				neoReferenceId_closeApproachDate: {
					neoReferenceId: asteroid.neoReferenceId,
					closeApproachDate: asteroid.closeApproachDate,
				},
			},
			create: {
				neoReferenceId: asteroid.neoReferenceId,
				name: asteroid.name,
				nasaJplUrl: asteroid.nasaJplUrl,
				isPotentiallyHazardous: asteroid.isPotentiallyHazardous,
				absoluteMagnitude: asteroid.absoluteMagnitude,
				estimatedDiameter: asteroid.estimatedDiameter,
				closeApproachDate: asteroid.closeApproachDate,
				relativeVelocity: asteroid.relativeVelocity,
				missDistance: asteroid.missDistance,
				orbitingBody: asteroid.orbitingBody,
				raw: asteroid.raw,
			},
			update: {
				name: asteroid.name,
				nasaJplUrl: asteroid.nasaJplUrl,
				isPotentiallyHazardous: asteroid.isPotentiallyHazardous,
				absoluteMagnitude: asteroid.absoluteMagnitude,
				estimatedDiameter: asteroid.estimatedDiameter,
				relativeVelocity: asteroid.relativeVelocity,
				missDistance: asteroid.missDistance,
				orbitingBody: asteroid.orbitingBody,
				raw: asteroid.raw,
			},
		}),
	);

	await Promise.all(upserts);
	return rows.length;
}

export async function syncDailyCache() {
	const today = getToday();
	const apod = await fetchApod(today);
	await upsertApodSnapshot(apod);

	const endDate = formatIsoDate(addDays(parseISO(today), 7));
	const feed = await fetchNeoFeed(today, endDate);
	const synced = await syncAsteroidFeed(feed);

	return {
		apodDate: today,
		asteroidCount: synced,
		startDate: today,
		endDate,
		elementCount: feed.element_count,
	};
}
