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

export const NeoRelativeVelocitySchema = z.object({
	kilometers_per_second: z.string(),
	kilometers_per_hour: z.string(),
	miles_per_hour: z.string(),
});

export const NeoMissDistanceSchema = z.object({
	astronomical: z.string(),
	lunar: z.string(),
	kilometers: z.string(),
	miles: z.string(),
});

export const NeoCloseApproachSchema = z.object({
	close_approach_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	epoch_date_close_approach: z.number(),
	relative_velocity: NeoRelativeVelocitySchema,
	miss_distance: NeoMissDistanceSchema,
	orbiting_body: z.string(),
});

export const NeoObjectSchema = z.object({
	id: z.string(),
	neo_reference_id: z.string(),
	name: z.string(),
	nasa_jpl_url: z.string().url(),
	absolute_magnitude_h: z.number(),
	estimated_diameter: z.object({
		kilometers: z.object({
			estimated_diameter_min: z.number(),
			estimated_diameter_max: z.number(),
		}),
		meters: z.object({
			estimated_diameter_min: z.number(),
			estimated_diameter_max: z.number(),
		}),
		miles: z.object({
			estimated_diameter_min: z.number(),
			estimated_diameter_max: z.number(),
		}),
		feet: z.object({
			estimated_diameter_min: z.number(),
			estimated_diameter_max: z.number(),
		}),
	}),
	is_potentially_hazardous_asteroid: z.boolean(),
	close_approach_data: z.array(NeoCloseApproachSchema),
	is_sentry_object: z.boolean(),
});

export const NeoFeedSchema = z.object({
	links: z.object({
		next: z.string().url(),
		prev: z.string().url(),
		self: z.string().url(),
	}),
	element_count: z.number(),
	near_earth_objects: z.record(z.string(), z.array(NeoObjectSchema)),
});

export type Apod = z.infer<typeof ApodSchema>;
export type NeoObject = z.infer<typeof NeoObjectSchema>;
export type NeoFeed = z.infer<typeof NeoFeedSchema>;
