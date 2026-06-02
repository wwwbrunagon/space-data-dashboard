import Image from 'next/image';
import { fetchApod } from '@/lib/nasa';

interface Props {
	date?: string;
}

export default async function ApodCard({ date }: Props) {
	const apod = await fetchApod(date);

	return (
		<article className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-xl shadow-slate-900/5 dark:border-slate-800/90 dark:bg-slate-950/90">
			<div className="relative aspect-video bg-slate-950">
				{apod.media_type === 'image' ? (
					<Image
						src={apod.hdurl ?? apod.url}
						alt={apod.title}
						fill
						className="object-cover"
						sizes="(max-width: 768px) 100vw, 1200px"
						priority
					/>
				) : (
					<iframe
						src={apod.url}
						title={apod.title}
						allowFullScreen
						className="h-full w-full"
					/>
				)}
			</div>

			<div className="space-y-4 p-6 sm:p-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
							Astronomy Photo of the Day
						</p>
						<h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
							{apod.title}
						</h1>
					</div>
					<div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-300">
						{apod.date}
					</div>
				</div>

				<p className="text-base leading-7 text-slate-700 dark:text-slate-300">
					{apod.explanation}
				</p>

				{apod.copyright ? (
					<p className="text-sm text-slate-500 dark:text-slate-400">
						© {apod.copyright}
					</p>
				) : null}
			</div>
		</article>
	);
}
