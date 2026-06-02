import ApodCard from '@/components/ApodCard';
import AsteroidTable, { type AsteroidRow } from '@/components/AsteroidTable';
import { getAsteroidsForNextWeek } from '@/lib/space';

export const dynamic = 'force-dynamic';

export default async function Home() {
	const asteroids = await getAsteroidsForNextWeek();
	const asteroidRows: AsteroidRow[] = asteroids.map((asteroid) => ({
		id: asteroid.id,
		neoReferenceId: asteroid.neoReferenceId,
		name: asteroid.name,
		nasaJplUrl: asteroid.nasaJplUrl,
		isPotentiallyHazardous: asteroid.isPotentiallyHazardous,
		absoluteMagnitude: asteroid.absoluteMagnitude,
		estimatedDiameter:
			asteroid.estimatedDiameter as AsteroidRow['estimatedDiameter'],
		closeApproachDate: asteroid.closeApproachDate.toISOString().slice(0, 10),
		relativeVelocity:
			asteroid.relativeVelocity as AsteroidRow['relativeVelocity'],
		missDistance: asteroid.missDistance as AsteroidRow['missDistance'],
		orbitingBody: asteroid.orbitingBody,
	}));

	return (
		<div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<section className="space-y-4 text-center sm:text-left">
					<p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">
						Space Data Dashboard
					</p>
					<h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
						Solar System Explorer
					</h1>
					<p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
						Explore NASA&rsquo;s Astronomy Photo of the Day and track near-Earth
						objects for the next seven days. This dashboard combines APOD
						metadata with asteroid approach data in a single server-rendered
						experience.
					</p>
				</section>

				<section>
					<ApodCard />
				</section>

				<section>
					<AsteroidTable initialAsteroids={asteroidRows} />
				</section>
			</main>
		</div>
	);
}
