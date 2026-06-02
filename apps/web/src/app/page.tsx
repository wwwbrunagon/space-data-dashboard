import ApodCard from '@/components/ApodCard';

export const dynamic = 'force-dynamic';

export default function Home() {
	return (
		<div className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
			<main className="mx-auto flex w-full max-w-5xl flex-col gap-8">
				<section className="space-y-4 text-center sm:text-left">
					<p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">
						Space Data Dashboard
					</p>
					<h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
						Astronomy Photo of the Day
					</h1>
					<p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
						Explore NASA's daily APOD with metadata and a rich preview. This
						feature fetches the official Astronomy Photo of the Day and renders
						it as a server-side dashboard card.
					</p>
				</section>

				<section>
					<ApodCard />
				</section>
			</main>
		</div>
	);
}
