'use client';

import { useMemo, useState } from 'react';

export type AsteroidRow = {
	id: string;
	neoReferenceId: string;
	name: string;
	nasaJplUrl: string;
	isPotentiallyHazardous: boolean;
	absoluteMagnitude: number;
	estimatedDiameter: {
		kilometers: {
			estimated_diameter_min: number;
			estimated_diameter_max: number;
		};
	};
	closeApproachDate: string;
	relativeVelocity: {
		kilometers_per_hour: string;
	};
	missDistance: {
		kilometers: string;
		lunar: string;
		miles: string;
	};
	orbitingBody: string;
};

type SortKey = 'closeApproachDate' | 'name' | 'absoluteMagnitude';

const formatDate = (date: string) =>
	new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(date));

const formatNumber = (value: number | string, digits = 0) =>
	new Intl.NumberFormat('en-US', {
		maximumFractionDigits: digits,
		minimumFractionDigits: digits,
	}).format(Number(value));

interface Props {
	initialAsteroids: AsteroidRow[];
}

export default function AsteroidTable({ initialAsteroids }: Props) {
	const [hazardOnly, setHazardOnly] = useState(false);
	const [sortKey, setSortKey] = useState<SortKey>('closeApproachDate');
	const [ascending, setAscending] = useState(true);

	const filteredAsteroids = useMemo(() => {
		const rows = hazardOnly
			? initialAsteroids.filter((asteroid) => asteroid.isPotentiallyHazardous)
			: initialAsteroids;

		return [...rows].sort((left, right) => {
			const leftValue = left[sortKey];
			const rightValue = right[sortKey];

			if (sortKey === 'name') {
				return ascending
					? String(leftValue).localeCompare(String(rightValue))
					: String(rightValue).localeCompare(String(leftValue));
			}

			const leftNumber = Number(leftValue);
			const rightNumber = Number(rightValue);
			if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
				return 0;
			}

			return ascending ? leftNumber - rightNumber : rightNumber - leftNumber;
		});
	}, [hazardOnly, initialAsteroids, sortKey, ascending]);

	return (
		<section className="space-y-4 rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-900/5 dark:border-slate-800/90 dark:bg-slate-950/90">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
						Near-Earth Object Tracker
					</p>
					<h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
						Asteroids approaching Earth in the next 7 days
					</h2>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">
						{filteredAsteroids.length} object
						{filteredAsteroids.length === 1 ? '' : 's'}
					</div>
					<button
						type="button"
						onClick={() => setHazardOnly((current) => !current)}
						className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
							hazardOnly
								? 'bg-rose-500 text-white hover:bg-rose-600'
								: 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
						}`}
					>
						{hazardOnly ? 'Showing hazardous only' : 'Show hazardous only'}
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-3 rounded-3xl bg-slate-950/5 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="text-sm text-slate-600 dark:text-slate-400">
					{initialAsteroids.length === 0
						? 'No asteroid data available yet. The system will fetch data from NASA when needed.'
						: `Showing ${filteredAsteroids.length} of ${initialAsteroids.length} asteroids from the next 7 days.`}
				</div>
				<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
					<label className="text-sm text-slate-600 dark:text-slate-400">
						Sort by{' '}
						<select
							value={sortKey}
							onChange={(event) => setSortKey(event.target.value as SortKey)}
							className="ml-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
						>
							<option value="closeApproachDate">Approach date</option>
							<option value="name">Name</option>
							<option value="absoluteMagnitude">Brightness</option>
						</select>
					</label>
					<button
						type="button"
						onClick={() => setAscending((current) => !current)}
						className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
					>
						{ascending ? 'Ascending' : 'Descending'}
					</button>
				</div>
			</div>

			{filteredAsteroids.length === 0 ? (
				<div className="rounded-3xl border border-dashed border-slate-300/60 bg-slate-50 p-10 text-center text-slate-600 dark:border-slate-700/60 dark:bg-slate-900 dark:text-slate-300">
					No asteroids match the current filters.
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full border-separate border-spacing-y-3 text-left text-sm sm:text-base">
						<thead>
							<tr>
								<th className="px-4 py-3 text-slate-500">Date</th>
								<th className="px-4 py-3 text-slate-500">Object</th>
								<th className="px-4 py-3 text-slate-500">Hazardous</th>
								<th className="px-4 py-3 text-slate-500">Diameter (km)</th>
								<th className="px-4 py-3 text-slate-500">Velocity (km/h)</th>
								<th className="px-4 py-3 text-slate-500">Miss distance (LD)</th>
								<th className="px-4 py-3 text-slate-500">Orbiting</th>
							</tr>
						</thead>
						<tbody>
							{filteredAsteroids.map((asteroid) => (
								<tr
									key={`${asteroid.neoReferenceId}-${asteroid.closeApproachDate}`}
									className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-sm shadow-slate-900/5 transition hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-950/80 dark:hover:bg-slate-900"
								>
									<td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
										{formatDate(asteroid.closeApproachDate)}
									</td>
									<td className="px-4 py-4 align-top text-slate-900 dark:text-slate-100">
										<a
											href={asteroid.nasaJplUrl}
											target="_blank"
											rel="noreferrer"
											className="font-semibold text-slate-900 underline decoration-sky-500 decoration-2 underline-offset-4 dark:text-sky-300"
										>
											{asteroid.name}
										</a>
									</td>
									<td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
										{asteroid.isPotentiallyHazardous ? 'Yes' : 'No'}
									</td>
									<td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
										{formatNumber(
											asteroid.estimatedDiameter.kilometers
												.estimated_diameter_min,
											2,
										)}{' '}
										—{' '}
										{formatNumber(
											asteroid.estimatedDiameter.kilometers
												.estimated_diameter_max,
											2,
										)}
									</td>
									<td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
										{formatNumber(
											asteroid.relativeVelocity.kilometers_per_hour,
											0,
										)}
									</td>
									<td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
										{formatNumber(asteroid.missDistance.lunar, 2)}
									</td>
									<td className="px-4 py-4 align-top text-slate-700 dark:text-slate-300">
										{asteroid.orbitingBody}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
