import { z } from 'zod';

export const ApodSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	explanation: z.string(),
	hdurl: z.string().url().optional(),
	media_type: z.enum(['image', 'video']),
	service_version: z.string(),
	title: z.string(),
	url: z.string().url(),
	copyright: z.string().optional(),
});

export type Apod = z.infer<typeof ApodSchema>;
