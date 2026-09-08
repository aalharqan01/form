CREATE TABLE `coach_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `coaching_checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_id` text NOT NULL,
	`week` text NOT NULL,
	`answers` text NOT NULL,
	`feedback` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE TABLE `coaching_memberships` (
	`id` text PRIMARY KEY NOT NULL,
	`coach_id` text NOT NULL,
	`trainee_id` text,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`status` text DEFAULT 'invited' NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`offer` text NOT NULL,
	`intake` text DEFAULT '{}' NOT NULL,
	`program` text DEFAULT 'null' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`coach_read_at` text DEFAULT '' NOT NULL,
	`trainee_read_at` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`accepted_at` text,
	`ended_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coaching_memberships_token_hash_unique` ON `coaching_memberships` (`token_hash`);--> statement-breakpoint
CREATE TABLE `coaching_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`membership_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL
);
