CREATE TABLE `coach_workout_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_id` text NOT NULL,
	`routine` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
